import dateparser
def format_datetime(str, format='iso'):
    """Convert String into the Given Datetime Format

    Given a string convert it into the provided format, if no format is given
    lets use ISO!

    Arguments:
        str {string} -- A string representation of a date

    Keyword Arguments:
        format {str} -- Datetime format to convert the string into  (default: {'iso'})

    Returns:
        [string] -- The newly formatted datetime string
    """

    try:
        date = dateparser.parse(str)
        if format == 'iso':
            return date.isoformat()
        elif format == 'post':
            return date.strftime('%d %B %Y')
        else:
            return date.strftime(format)
    except TypeError:
        return str
