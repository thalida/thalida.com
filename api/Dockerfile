FROM python:3.9

COPY ./ /api
WORKDIR /api

# https://pipenv-fork.readthedocs.io/en/latest/advanced.html#using-pipenv-for-deployments
RUN pip install pipenv
RUN pipenv install --system --deploy

ENTRYPOINT python api.py
