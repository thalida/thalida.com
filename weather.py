from secrets import Secrets
from darksky import forecast
import geocoder

class Weather:
    NEWYORK = [40.7081, -73.9571]

    def __init__(self, request):
        ip = request.environ.get('HTTP_X_REAL_IP', request.remote_addr)
        geo = geocoder.ip(ip)
        coords = geo.latlng if len(geo.latlng) == 2 else self.NEWYORK
        self.lat, self.lon = coords

    def get_forecast(self):
        self.forecast = forecast(Secrets.FORECAST_KEY, self.lat, self.lon)
        return self.forecast
        
