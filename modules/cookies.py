import json
import time
import dateparser
from datetime import datetime

NAMESPACE = 'TIA'
KEYS = {
    'WEATHER': 'weather',
    'LAST_VISIT': 'visit_timestamp',
    'LAST_RESTART': 'server_restart_timestamp',
    'NUM_VISITS': 'total_visits',
}

SERVER_START_TIME = time.time()
SERVER_START_DATETIME = datetime.now()


def format_cookie_key(name):
    """Format a Name into the Cookie Format

    Add the proper namspacing to my cookies to differentiate them

    Arguments:
    name {string} -- Any string name for a cookie
    """
    return '{namespace}-{name}'.format(namespace=NAMESPACE, name=name)


def get_force_update(request):
    """Get If We Should Force an Update

    Check when I last updated the cookies and if the visitor hasn't been to the
    site since then force an update

    Arguments:
        request -- A Flast Request

    Returns:
        [bool] -- Boolean on if we should force a site and/or cookie update
    """
    now = datetime.now()
    last_restart = request.cookies.get(format_cookie_key(KEYS['LAST_RESTART']), now.isoformat())
    last_restart_as_datetime = dateparser.parse(last_restart)
    force_update = (SERVER_START_DATETIME - last_restart_as_datetime).total_seconds() > 0

    return force_update


def set_cookies(request, response, weather=None, visit=True):
    """Set/Update Cookie Values

    Given the data provided update my site cookies with visitor data

    Arguments:
        request -- A Flask Request
        response -- A Flast Response

    Keyword Arguments:
        weather {dict} -- Current weather data dictionary (default: {None})
        visit {bool} -- Does this call to set cookies count as a site visit? (default: {True})
    """

    # check if a force update of cookies is required
    force_update = get_force_update(request)

    # Update cookies
    _set_last_restart_cookie(request, response)
    _set_weather_cookie(request, response, force_update, weather)
    _set_visit_cookie(request, response, force_update, visit)

def _set_last_restart_cookie(request, response):
    # Update last restart cookie with current value
    response.set_cookie(
        format_cookie_key(KEYS['LAST_RESTART']),
        str(SERVER_START_DATETIME.isoformat()),
        max_age=120*24*60*60 # save for 120 days
    )

def _set_weather_cookie(request, response, force_update, weather):
    # Set the weather cookie if we have weather data and we're forced to or the
    # weather wasn't fetched from a cookie already
    if weather is not None and (force_update or weather['from_cookie'] is False):
        response.set_cookie(
            format_cookie_key(KEYS['WEATHER']),
            json.dumps(weather['current']),
            max_age=15*60  # keep for 15min - the weather will update every 15min
        )

def _set_visit_cookie(request, response, force_update, visit):
    if force_update or visit:
        now = datetime.now()
        # Get the time the guest last visited
        last_visit = request.cookies.get(format_cookie_key(KEYS['LAST_VISIT']), now.isoformat())
        last_visit_as_datetime = dateparser.parse(last_visit)

        # Only increment visits if there's been at least 1min from the last visit
        # or if this is the first visit
        time_since_last_visit = (now - last_visit_as_datetime).total_seconds()
        num_visits = int(request.cookies.get(format_cookie_key(KEYS['NUM_VISITS']), 0))
        if time_since_last_visit > 60 or num_visits == 0:
            num_visits = num_visits + 1
            response.set_cookie(
                format_cookie_key(KEYS['NUM_VISITS']),
                str(num_visits),
                max_age=60*24*60*60 # save for 60 days
            )

        # Update last visit cookie with current datetime
        response.set_cookie(
            format_cookie_key(KEYS['LAST_VISIT']),
            str(now.isoformat()),
            max_age=120*24*60*60 # save for 120 days
        )
