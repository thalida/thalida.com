from python:3.6

MAINTAINER Thalida Noel "hello@thalida.com"

WORKDIR /tsh/

COPY Pipfile* /tsh/

RUN pip install pipenv
RUN pipenv install --system --deploy

COPY . /tsh/

CMD ["python", "main.py"]
