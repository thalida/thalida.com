FROM thalida/docker-php-apache:latest
COPY --chown=755 . /var/www/html
