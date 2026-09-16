# Project workflow

- The user requests that every completed change to this project be committed and pushed to GitHub. After appropriate verification, commit the files for the current task and push to the current branch's remote without requesting confirmation again.
- Keep unrelated local files out of commits. Do not force-push.
- When updating the album data in `assets/memories.js`, update its version query in `index.html` so browsers request the latest file.
- Report push failures honestly; a successful push alone does not confirm that GitHub Pages has finished deploying.
