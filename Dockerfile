FROM thalida/docker-php-apache:latest

# Enable .htaccess processing
RUN sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

COPY --chown=755 . /var/www/html
