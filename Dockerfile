from python:3.6

MAINTAINER Thalida Noel "hello@thalida.com"

WORKDIR /app/

COPY Pipfile* /app/

RUN pip install pipenv
RUN pipenv install --system --deploy

COPY . /app/

CMD ["python", "app.py"]
