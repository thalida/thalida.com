## Docker Commands

```
alias t2012-push="docker build -t thalida/thalida.com:2012 . && docker push thalida/thalida.com:2012"
alias t2012-sync="ssh do 'cd ~/thalida.com; docker pull thalida/thalida.com:2012; docker-compose up -d --no-deps --remove-orphans 2012_thalida'"
alias t2012-deploy="t2012-push && t2012-sync"
alias t2012-run="docker run -dit -p 8080:80 thalida/thalida.com:2012"
```
