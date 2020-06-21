import dateparser
import modules.utils as utils
from datetime import datetime

"""Work History

Work history (start and end dates, job title, and employer) as well as stats
about my employment history

Returns:
    [dict] -- Work history and stats
"""
now = datetime.now()
work_history = [
    {
        'company': 'Etsy',
        'title': 'Engineering Manager',
        'dates': [utils.format_datetime('July 2018'), None],
        'is_hiring': True
    },
    {
        'company': 'Etsy',
        'title': 'Senior Product Engineer',
        'dates': [utils.format_datetime('May 2017'), utils.format_datetime('July 2018'),],
        'is_hiring': True
    },
    {
        'company': 'Kinnek',
        'title': 'Senior Frontend Engineer',
        'dates': [utils.format_datetime('November 2015'), utils.format_datetime('May 2017')]
    },
    {
        'company': 'OkCupid',
        'title': 'Frontend Engineer',
        'dates': [utils.format_datetime('January 2014'), utils.format_datetime('November 2015')]
    },
    {
        'company': 'Webs',
        'title': 'Frontend Engineer Intern',
        'dates': [utils.format_datetime('January 2013'), utils.format_datetime('January 2014')]
    },
    {
        'company': 'NASA&nbsp;Goddard&nbsp;/ Space&nbsp;Operations&nbsp;Institute',
        'title': 'Software Engineer Intern',
        'dates': [utils.format_datetime('March 2010'), utils.format_datetime('January 2013')]
    },
]

first_job_startdate = dateparser.parse(work_history[-1]['dates'][0])
years_since_start = int(now.strftime('%Y')) - int(first_job_startdate.strftime('%Y'))

work = {
    'history': work_history,
    'years_since_start': years_since_start,
}
