from window import Window
my_window = Window()

# # Builtins
# from pprint import pprint
# import datetime
# import time
# import json

# # Third Party
# from darksky import forecast
# import geocoder
# import dateparser
# import math

# COLORS = [
#     { "r": 50, "g": 60, "b": 100 },
#     { "r": 139, "g": 152, "b": 206 },
#     { "r": 86, "g": 216, "b": 255 },
#     { "r": 255, "g": 216, "b": 116 },
#     { "r": 255, "g": 183, "b": 116 },
#     { "r": 255, "g": 135, "b": 116 },
#     { "r": 40, "g": 75, "b": 215 },
# ]
# SUNRISE_COLOR_INDEX = 1
# SUNSET_COLOR_INDEX = 5

# sunrise_time = 1530955988
# sunset_time = 1531009843
# now = int(time.time()) #1530994900
# # now = 1530982915

# is_before_sunrise = now < sunrise_time
# is_after_sunset = now > sunset_time

# if is_before_sunrise:
#     start_index = 0
#     end_index = SUNRISE_COLOR_INDEX
#     midnight_today = datetime.datetime.combine(datetime.date.today(), datetime.datetime.min.time())
#     start_time = int(midnight_today.timestamp())
#     end_time = sunrise_time
# elif is_after_sunset:
#     start_index = SUNSET_COLOR_INDEX
#     end_index = len(COLORS) - 1
#     tomorrow = datetime.datetime.combine(datetime.date.today() + datetime.timedelta(days=1), datetime.datetime.min.time())
#     start_time = sunset_time
#     end_time = int(tomorrow.timestamp())
# else:
#     start_index = SUNRISE_COLOR_INDEX
#     end_index = SUNSET_COLOR_INDEX
#     start_time = sunrise_time
#     end_time = sunset_time

# num_colors_options = end_index - start_index + 1
# color_section = math.ceil(100 / num_colors_options)
# percent_time_elapsed = ((now - start_time) / (end_time - start_time)) * 100

# for i in range(num_colors_options):
#     color_percent = color_section * (i + 1);
#     color_index = start_index + i;
    
#     if percent_time_elapsed < color_percent:
#         print(color_index, color_percent, percent_time_elapsed)
#         break;


# # print(sunrise_time, sunset_time, now, end_time, num_colors_options, color_section, percent_time_elapsed)


