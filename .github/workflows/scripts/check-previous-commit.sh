#!/bin/bash

# Help prevent infinite loops before committing

PREVIOUS_COMMIT_MESSAGE=$1

# Check if there are any changes or new files (tracked or untracked)
if git diff --quiet --exit-code && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "No changes detected, will not commit."
  exit 0
fi

# Check if the last commit was a linter commit
LAST_COMMIT_MSG=$(git log --no-merges -1 --pretty=%B)
if echo "$LAST_COMMIT_MSG" | grep -qE "$PREVIOUS_COMMIT_MESSAGE"; then
  echo "ERROR: Infinite loop detected!"
  echo "There are uncommitted changes AND the last commit was a '$PREVIOUS_COMMIT_MESSAGE' commit."
  echo "This would cause an infinite loop. Please review manually."
  exit 1
fi

echo "No loop detected. Proceeding with commit."
exit 0
