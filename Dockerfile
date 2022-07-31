FROM python:3.9

WORKDIR /app/

COPY Pipfile* /app/

RUN pip install pipenv
RUN pipenv install --system --deploy

COPY . /app/

CMD ["python", "app.py"]
