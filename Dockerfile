FROM httpd:alpine

COPY dist/ /usr/local/apache2/htdocs/
