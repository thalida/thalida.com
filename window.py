# Builtins
from pprint import pprint
import datetime
import time
import math
import json

# Third Party
from darksky import forecast
import geocoder
import dateparser

# Locals
import secrets


class Window:
    TIME_SAYINGS = [
        {
            "label": "Late Night",
            "salutation": "Greetings",
        },
        {
            "label": "Eary Morning",
            "salutation": "Oh hey, Early Riser",
        },
        {
            "label": "Morning",
            "salutation": "Good morning",
        },
        {
            "label": "Afternoon",
            "salutation": "Good afternoon",
        },
        {
            "label": "Mid-Afternoon",
            "salutation": "Good afternoon",
        },
        {
            "label": "Evening",
            "salutation": "Good evening",
        },
        {
            "label": "Night",
            "salutation": "Good night",
        }
    ]

    TIME_COLORS = [
        { "r": 50, "g": 60, "b": 100 },
        { "r": 139, "g": 152, "b": 206 },
        { "r": 86, "g": 216, "b": 255 },
        { "r": 255, "g": 216, "b": 116 },
        { "r": 255, "g": 183, "b": 116 },
        { "r": 255, "g": 135, "b": 116 },
        { "r": 40, "g": 75, "b": 215 },
    ]
    SUNRISE_TIME_COLOR_INDEX = 1
    SUNSET_TIME_COLOR_INDEX = 5

    def get_state(self, request, force_update, weather_cookie):
        now = int(time.time())
        weather = self._get_weather(request, force_update, weather_cookie)
        color = self._get_color(now, weather['current']['sunrise_time'], weather['current']['sunset_time'])
        saying = self._get_saying(now)
        return {
            'weather': weather,
            'color': color,
            'saying': saying,
        }

    def get_range_over_day(self, request, force_update, weather_cookie):
        weather = self._get_weather(request, force_update, weather_cookie)
        ranges = []

        for h in range(24):
            print(h)
            for m in [0, 15, 30, 45, 59]:
                time = datetime.datetime.combine(datetime.date.today(), datetime.time(h, m)).timestamp()
                color = self._get_color(time, weather['current']['sunrise_time'], weather['current']['sunset_time'])
                saying = self._get_saying(time)
                ranges.append({'color': color, 'saying': saying})

        # for h in range(24):
        #     print(h)
        #     for m in range(60):
        #         time = datetime.datetime.combine(datetime.date.today(), datetime.time(h, m)).timestamp()
        #         color = self._get_color(time, weather['current']['sunrise_time'], weather['current']['sunset_time'])
        #         saying = self._get_saying(time)
        #         ranges.append({'color': color, 'saying': saying})

        # for h in range(24):
        #     print(h)
        #     for m in range(60):
        #         for s in [0, 10, 20, 30, 40, 50, 59]:
        #             time = datetime.datetime.combine(datetime.date.today(), datetime.time(h, m, s)).timestamp()
        #             color = self._get_color(time, weather['current']['sunrise_time'], weather['current']['sunset_time'])
        #             saying = self._get_saying(time)
        #             ranges.append({'color': color, 'saying': saying})

        # for h in range(24):
        #     print(h)
        #     for m in range(60):
        #         for s in range(60):
        #             time = datetime.datetime.combine(datetime.date.today(), datetime.time(h, m, s)).timestamp()
        #             timedata = self._get_color(time, weather['current']['sunrise_time'], weather['current']['sunset_time'])
        #             ranges.append(timedata)

        return ranges

    def _get_weather(self, request, force_update, weather_cookie):
        """Get Current Weather Based on IP Address

        Based on the current ip location, getthe current weather (or use NY if location
        is not available.) Save that data to a cookie to reduce # of api calls.

        Arguments:
            request -- A Flast Request
            force_update {bool} -- Should we force update the weather data
            weather_cookie -- Stored weather data
        """

        # Get current weather for location based on IP
        if weather_cookie and not force_update:
            from_cookie = True;
            current_weather = json.loads(weather_cookie)
        else:
            from_cookie = False

            # fallback latitute/longitude data
            newyork_latlng = [40.7081, -73.9571]
            tt_latlng = [10.65, -61.5167]
            default_laglng = tt_latlng

            # Get the visitors IP and lat/lng for that IP
            ip = request.environ.get('HTTP_X_REAL_IP', request.remote_addr)
            geo = geocoder.ip(ip)
            lat, lng = geo.latlng if len(geo.latlng) == 2 else default_laglng

            # Use Darksky to get the current forcast for that lat/lng
            geo_forecast = forecast(secrets.FORECAST_KEY, lat, lng)

            # Get and format the current weather
            daily_weather = geo_forecast['daily']['data'][0]
            current_weather = geo_forecast['currently']
            current_weather['units'] = geo_forecast['flags']['units'] # F or C
            current_weather['sunrise_time'] = daily_weather['sunriseTime']
            current_weather['sunset_time'] = daily_weather['sunsetTime']
            current_weather['debug'] = {
                'newyork_latlng': newyork_latlng,
                'lat_lng': {'lat': lat, 'lng': lng},
                'ip': ip,
                'geo': geo.latlng,
            }

        return {'current': current_weather, 'from_cookie': from_cookie}

    def _format_color(self, color):
        is_arr = isinstance(color, list)
        color_arr = color if is_arr else [color['r'], color['g'], color['b']]
        color_dict = color if not is_arr else {'r': color[0], 'g': color[1], 'b': color[2]}

        return {
            'as_str': f"rgb({color_dict['r']}, {color_dict['g']}, {color_dict['b']})",
            'as_arr': color_arr,
            'as_dict': color_dict,
        }

    def _get_blended_color(self, start_color, end_color, distance):
        blended_color = {}
        for part in ['r', 'g', 'b']:
            start = start_color[part]
            end = end_color[part]
            blended_color[part] = round(start + ((end - start) * distance))
        return blended_color

    def _get_saying(self, now):
        midnight_today = int(datetime.datetime.combine(datetime.date.today(), datetime.datetime.min.time()).timestamp())
        tomorrow = int(datetime.datetime.combine(datetime.date.today() + datetime.timedelta(days=1), datetime.datetime.min.time()).timestamp())

        percent_time_elapsed = (now - midnight_today) / (tomorrow - midnight_today)
        num_sayings_options = len(self.TIME_SAYINGS)
        sayings_section = math.ceil(100 / num_sayings_options) / 100

        found_saying_index = None
        for i in range(num_sayings_options):
            end_saying_percent = sayings_section * (i + 1);
            if percent_time_elapsed < end_saying_percent:
                found_saying_index = i
                break;

        return self.TIME_SAYINGS[found_saying_index]


    def _get_color(self, now, sunrise, sunset):
        if now < sunrise:
            start_index = 0
            end_index = self.SUNRISE_TIME_COLOR_INDEX
            midnight_today = datetime.datetime.combine(datetime.date.today(), datetime.datetime.min.time())
            start_time = int(midnight_today.timestamp())
            end_time = sunrise - 1
        elif now > sunset:
            start_index = self.SUNSET_TIME_COLOR_INDEX
            end_index = len(self.TIME_COLORS) - 1
            tomorrow = datetime.datetime.combine(datetime.date.today() + datetime.timedelta(days=1), datetime.datetime.min.time())
            start_time = sunset + 1
            end_time = int(tomorrow.timestamp())
        else:
            start_index = self.SUNRISE_TIME_COLOR_INDEX
            end_index = self.SUNSET_TIME_COLOR_INDEX
            start_time = sunrise
            end_time = sunset

        percent_time_elapsed = (now - start_time) / (end_time - start_time)
        num_colors_options = end_index - start_index + 1
        color_section = math.ceil(100 / num_colors_options) / 100

        found_start_color_index = 0
        found_end_color_index = 0
        found_start_color_percent = 0
        found_end_color_percent = 0
        for i in range(num_colors_options):
            found_start_color_percent = color_section * i
            found_end_color_percent = color_section * (i + 1);

            if percent_time_elapsed < found_end_color_percent:
                found_start_color_index = start_index + i
                if found_start_color_index < len(self.TIME_COLORS) - 1:
                    if i < num_colors_options - 1:
                        found_end_color_index = found_start_color_index + 1
                    else:
                        found_end_color_index = found_start_color_index
                else:
                    found_end_color_index = 0
                break;

        color_start_time = start_time + ((end_time - start_time) * found_start_color_percent)
        color_end_time = start_time + ((end_time - start_time) * found_end_color_percent)
        start_color = self.TIME_COLORS[found_start_color_index]
        end_color = self.TIME_COLORS[found_end_color_index]
        mins_since_start = (now - color_start_time) / 60
        mins_in_range = (color_end_time - color_start_time) / 60
        distance = (mins_since_start / mins_in_range)
        blended_color = self._get_blended_color(start_color, end_color, distance)
        return self._format_color(blended_color)
