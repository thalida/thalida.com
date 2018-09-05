FROM thalida/docker-php-apache:latest
COPY . /var/www/html
RUN chmod -R 755 /var/www/html
