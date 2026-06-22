import { Request, Response } from 'express';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import os from 'os';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'credisa_inventory',
});

function escapeValue(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

class BackupController {

  public async createBackup(req: Request, res: Response): Promise<void> {
    try {
      if (!req.usuario) {
        res.status(401).json({ success: false, message: 'No autenticado' });
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `backup_credis_${timestamp}.sql`;

      const lines: string[] = [];
      lines.push(`-- Backup del sistema CREDISA`);
      lines.push(`-- Fecha: ${new Date().toISOString()}`);
      lines.push(`-- Base de datos: ${pool.options.database}`);
      lines.push('');

      const tablesResult = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      const tableNames: string[] = tablesResult.rows.map(r => r.table_name);

      for (const tableName of tableNames) {
        const colsResult = await pool.query(`
          SELECT column_name, data_type, column_default, is_nullable,
                 udt_name, character_maximum_length
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        const columns = colsResult.rows;

        const createLines: string[] = [];
        createLines.push(`CREATE TABLE IF NOT EXISTS "${tableName}" (`);

        const colDefs = columns.map(col => {
          let def = `"${col.column_name}" `;
          if (col.column_default && col.column_default.startsWith('nextval(')) {
            def += 'SERIAL';
          } else {
            def += col.data_type === 'character varying'
              ? `VARCHAR${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`
              : col.data_type === 'timestamp with time zone'
                ? 'TIMESTAMPTZ'
                : col.data_type === 'timestamp without time zone'
                  ? 'TIMESTAMP'
                  : col.data_type.toUpperCase();
          }
          if (col.is_nullable === 'NO') def += ' NOT NULL';
          return def;
        });

        createLines.push('  ' + colDefs.join(',\n  '));
        createLines.push(');');

        lines.push(`-- Estructura: ${tableName}`);
        lines.push(createLines.join('\n'));
        lines.push('');
      }

      for (const tableName of tableNames) {
        const dataResult = await pool.query(`SELECT * FROM "${tableName}"`);
        if (dataResult.rows.length === 0) continue;

        const colNames = Object.keys(dataResult.rows[0]);
        const escapedCols = colNames.map(c => `"${c}"`).join(', ');

        lines.push(`-- Datos: ${tableName} (${dataResult.rows.length} registros)`);

        for (const row of dataResult.rows) {
          const values = colNames.map(c => escapeValue(row[c])).join(', ');
          lines.push(`INSERT INTO "${tableName}" (${escapedCols}) VALUES (${values});`);
        }
        lines.push('');
      }

      const seqResult = await pool.query(`
        SELECT sequencename, last_value
        FROM pg_sequences
        WHERE schemaname = 'public'
      `);

      for (const seq of seqResult.rows) {
        lines.push(`SELECT setval('${seq.sequencename}', COALESCE((SELECT MAX(id) FROM "${seq.sequencename.replace('_id_seq', '')}"), 1));`);
      }
      lines.push('');

      const sqlContent = lines.join('\n');
      const tempDir = os.tmpdir();
      const filePath = path.join(tempDir, filename);
      fs.writeFileSync(filePath, sqlContent, 'utf-8');

      const stats = fs.statSync(filePath);

      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', stats.size);

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);

      stream.on('end', () => {
        setTimeout(() => { try { fs.unlinkSync(filePath); } catch {} }, 5000);
      });

      stream.on('error', () => {
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Error al enviar el archivo' });
        }
        try { fs.unlinkSync(filePath); } catch {}
      });
    } catch (error) {
      console.error('Error al crear respaldo:', error);
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({
        success: false,
        message: 'Error al crear el respaldo',
        error: process.env.NODE_ENV === 'development' ? msg : undefined
      });
    }
  }

  public async restoreBackup(req: Request, res: Response): Promise<void> {
    try {
      if (!req.usuario) {
        res.status(401).json({ success: false, message: 'No autenticado' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, message: 'No se ha proporcionado ningún archivo' });
        return;
      }

      const sqlContent = req.file.buffer.toString('utf-8');
      const statements = sqlContent
        .split(/;\s*\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      const client = await pool.connect();
      let executed = 0;
      let errors: string[] = [];

      try {
        await client.query('BEGIN');

        for (const stmt of statements) {
          try {
            await client.query(stmt);
            executed++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            errors.push(msg.substring(0, 100));
          }
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      const warnings = errors.length > 0
        ? ` (${errors.length} advertencias: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''})`
        : '';

      res.status(200).json({
        success: true,
        message: `Base de datos restaurada exitosamente. ${executed} sentencias ejecutadas.${warnings}`
      });
    } catch (error) {
      console.error('Error al restaurar:', error);
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({
        success: false,
        message: 'Error al restaurar la base de datos',
        error: process.env.NODE_ENV === 'development' ? msg : undefined
      });
    }
  }
}

export default new BackupController();
