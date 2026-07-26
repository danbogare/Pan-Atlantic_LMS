
#!/bin/bash

if [ -z "$1" ]; then
    echo "Error: Commit message not provided!!."
    exit 1
fi

# npm run build
# npm run lint
git add .
git commit -m "$1"
git push origin main
# git push heroku main
