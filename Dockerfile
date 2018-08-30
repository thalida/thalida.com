FROM php

WORKDIR /app/

COPY . /app/

CMD ["php", "-S", "0.0.0.0:8000"]
