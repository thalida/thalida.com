from python:3

MAINTAINER Thalida Noel "hello@thalida.com"

COPY . /app
WORKDIR /app

RUN pip install pipenv
RUN pipenv install --system --deploy

CMD ["python", "app.py"]
