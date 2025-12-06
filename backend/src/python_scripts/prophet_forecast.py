import sys
import json
import pandas as pd
from prophet import Prophet
from sklearn.metrics import mean_absolute_percentage_error
import numpy as np

def main():
    try:
        # Leer datos de entrada desde los argumentos
        historical_data = json.loads(sys.argv[1])
        days_to_forecast = int(sys.argv[2])
        
        # Convertir a DataFrame
        df = pd.DataFrame(historical_data)
        df['ds'] = pd.to_datetime(df['ds'])
        
        # Verificar que tengamos suficientes datos
        if len(df) < 30:
            raise ValueError("Se requieren al menos 30 días de datos históricos")
        
        # Configurar y entrenar el modelo
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode='multiplicative',
            changepoint_prior_scale=0.05,
            seasonality_prior_scale=10.0
        )
        
        model.fit(df)
        
        # Crear fechas futuras para la predicción
        future_dates = model.make_future_dataframe(periods=days_to_forecast)
        
        # Generar pronóstico
        forecast = model.predict(future_dates)
        
        # Calcular métricas de error (MAPE) para datos históricos
        y_true = df['y'].values
        y_pred = forecast['yhat'].head(len(y_true)).values
        mape = mean_absolute_percentage_error(y_true, y_pred) * 100
        
        # Preparar resultados
        result = {
            'forecast': forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(days_to_forecast).to_dict('records'),
            'mape': mape,
            'seasonality': {
                'weekly': model.seasonalities['weekly'].seasonalities if 'weekly' in model.seasonalities else [],
                'yearly': model.seasonalities['yearly'].seasonalities if 'yearly' in model.seasonalities else []
            }
        }
        
        # Imprimir el resultado como JSON
        print(json.dumps(result, default=str))
        
    except Exception as e:
        error = {
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error))
        sys.exit(1)

if __name__ == "__main__":
    main()
