/**
 * Comprehensive reference data for common terminal commands
 * Each command entry includes description, syntax, options, examples, etc.
 */

/**
 * Command reference database
 * Contains detailed information about common terminal commands
 */
export const commandReference = {
  ls: {
    description: "List directory contents",
    syntax: "ls [options] [file...]",
    category: "File Operations",
    options: {
      "-a, --all": "Do not ignore entries starting with .",
      "-l": "Use a long listing format",
      "-h, --human-readable": "Print sizes in human readable format",
      "-R, --recursive": "List subdirectories recursively",
      "-t": "Sort by modification time, newest first",
      "-S": "Sort by file size, largest first",
      "-r, --reverse": "Reverse order while sorting"
    },
    examples: [
      {
        command: "ls",
        description: "List files in the current directory"
      },
      {
        command: "ls -la",
        description: "List all files (including hidden) in long format"
      },
      {
        command: "ls -lh",
        description: "List files with human-readable sizes"
      },
      {
        command: "ls Documents/",
        description: "List files in the Documents directory"
      }
    ],
    tips: [
      "Use ls -lah for the most detailed view of all files",
      "Add --color=auto for colorized output on supported terminals"
    ],
    tags: ["directory", "files", "list"]
  },
  
  cd: {
    description: "Change the current directory",
    syntax: "cd [directory]",
    category: "Navigation",
    examples: [
      {
        command: "cd Documents/",
        description: "Change to the Documents directory"
      },
      {
        command: "cd ..",
        description: "Move up one directory"
      },
      {
        command: "cd ~",
        description: "Change to your home directory"
      },
      {
        command: "cd -",
        description: "Change to the previous directory"
      }
    ],
    tips: [
      "Use tab completion to avoid typing full directory names",
      "cd without arguments takes you to your home directory"
    ],
    tags: ["directory", "navigation"]
  },
  
  grep: {
    description: "Search for patterns in files",
    syntax: "grep [options] pattern [file...]",
    category: "Text Processing",
    options: {
      "-i, --ignore-case": "Ignore case distinctions",
      "-v, --invert-match": "Select non-matching lines",
      "-r, --recursive": "Read all files under each directory, recursively",
      "-n, --line-number": "Print line number with output lines",
      "-c, --count": "Print only a count of matching lines per file",
      "-A NUM": "Print NUM lines after match",
      "-B NUM": "Print NUM lines before match"
    },
    examples: [
      {
        command: "grep 'pattern' filename",
        description: "Search for 'pattern' in the specified file"
      },
      {
        command: "grep -i 'pattern' filename",
        description: "Search for 'pattern' case-insensitively"
      },
      {
        command: "grep -r 'pattern' directory/",
        description: "Search recursively through a directory"
      },
      {
        command: "command | grep 'pattern'",
        description: "Filter command output for lines containing 'pattern'"
      }
    ],
    tips: [
      "Use grep -n to show line numbers with matches",
      "Combine with pipes (|) to filter output from other commands",
      "For complex patterns, use grep -E to enable extended regular expressions",
      "Use grep -v to show lines that DON'T match the pattern"
    ],
    tags: ["search", "text", "filter", "pattern"]
  },
  
  find: {
    description: "Search for files in a directory hierarchy",
    syntax: "find [path...] [expression]",
    category: "File Operations",
    options: {
      "-name pattern": "Search for files matching name pattern",
      "-type [f|d]": "Search for files (f) or directories (d)",
      "-size n[cwbkMG]": "Search by file size",
      "-mtime n": "Search by modification time (days)",
      "-exec command": "Execute command on each file found",
      "-delete": "Delete found files/directories",
      "-maxdepth n": "Descend at most n levels"
    },
    examples: [
      {
        command: "find . -name \"*.txt\"",
        description: "Find all .txt files in current directory and subdirectories"
      },
      {
        command: "find /home -type d -name \"Documents\"",
        description: "Find directories named 'Documents' under /home"
      },
      {
        command: "find . -type f -size +10M",
        description: "Find files larger than 10 megabytes"
      },
      {
        command: "find . -name \"*.log\" -exec rm {} \\;",
        description: "Find and delete all .log files"
      }
    ],
    tips: [
      "Use -maxdepth option to limit directory recursion depth",
      "Combine with xargs for more complex operations",
      "Use {} as a placeholder for the current file in -exec",
      "Add -type f to find only files (not directories)"
    ],
    tags: ["search", "files", "find", "locate"]
  },
  
  // Git commands
  "git status": {
    description: "Show the working tree status",
    syntax: "git status [options]",
    category: "Version Control",
    options: {
      "-s, --short": "Give output in short format",
      "-b, --branch": "Show branch information",
      "--untracked-files[=mode]": "Show untracked files",
      "--ignored": "Show ignored files"
    },
    examples: [
      {
        command: "git status",
        description: "Show status of the current repository"
      },
      {
        command: "git status -s",
        description: "Show status in short format"
      }
    ],
    tips: [
      "Use this command frequently to see what files have been modified",
      "The short format is more concise for quick checks"
    ],
    tags: ["git", "version control", "status"]
  },
  
  "git commit": {
    description: "Record changes to the repository",
    syntax: "git commit [options]",
    category: "Version Control",
    options: {
      "-m <msg>": "Use the given message as commit message",
      "-a, --all": "Commit all changed files",
      "--amend": "Amend previous commit",
      "-v, --verbose": "Show diff in commit message editor"
    },
    examples: [
      {
        command: "git commit -m \"Add new feature\"",
        description: "Commit staged changes with a message"
      },
      {
        command: "git commit -am \"Fix bug\"",
        description: "Stage all tracked files and commit"
      },
      {
        command: "git commit --amend",
        description: "Modify the previous commit"
      }
    ],
    tips: [
      "Write meaningful commit messages to describe changes",
      "Use -am to stage and commit in one step",
      "Use --amend to fix mistakes in the last commit"
    ],
    tags: ["git", "version control", "commit"]
  },
  
  "git push": {
    description: "Update remote refs along with associated objects",
    syntax: "git push [options] [<repository> [<refspec>...]]",
    category: "Version Control",
    options: {
      "-u, --set-upstream": "Set upstream for git pull/status",
      "--force": "Force updates, may lose commits",
      "--tags": "Push all tags",
      "--all": "Push all branches"
    },
    examples: [
      {
        command: "git push origin main",
        description: "Push main branch to origin"
      },
      {
        command: "git push -u origin feature/new-branch",
        description: "Push and set upstream for a new branch"
      },
      {
        command: "git push --tags",
        description: "Push all tags to remote"
      }
    ],
    tips: [
      "Use -u when pushing a new branch for the first time",
      "Be careful with --force as it can overwrite remote changes",
      "Check git status before pushing to ensure you're pushing the right changes"
    ],
    tags: ["git", "version control", "push", "remote"]
  },
  
  "git pull": {
    description: "Fetch from and integrate with another repository or branch",
    syntax: "git pull [options] [<repository> [<refspec>...]]",
    category: "Version Control",
    options: {
      "--rebase": "Rebase local changes on top of remote changes",
      "--ff-only": "Only fast-forward changes",
      "--no-commit": "Don't commit after merge"
    },
    examples: [
      {
        command: "git pull",
        description: "Pull changes from the remote branch"
      },
      {
        command: "git pull --rebase",
        description: "Pull changes and rebase local commits"
      },
      {
        command: "git pull origin main",
        description: "Pull from main branch on origin"
      }
    ],
    tips: [
      "Use git pull --rebase to keep history cleaner",
      "Always check your local changes before pulling",
      "Consider git fetch + git merge for more control"
    ],
    tags: ["git", "version control", "pull", "fetch"]
  },
  
  // File operations
  cp: {
    description: "Copy files and directories",
    syntax: "cp [options] source dest",
    category: "File Operations",
    options: {
      "-r, --recursive": "Copy directories recursively",
      "-i, --interactive": "Prompt before overwrite",
      "-v, --verbose": "Explain what is being done",
      "-p, --preserve": "Preserve attributes"
    },
    examples: [
      {
        command: "cp file.txt backup.txt",
        description: "Copy a file to a new location"
      },
      {
        command: "cp -r directory1/ directory2/",
        description: "Copy a directory recursively"
      },
      {
        command: "cp -v *.txt /backup/",
        description: "Copy all text files to backup directory, showing progress"
      }
    ],
    tips: [
      "Always use -r when copying directories",
      "Use -i to avoid accidentally overwriting files",
      "Use wildcards to copy multiple files at once"
    ],
    tags: ["file", "copy", "backup"]
  },
  
  mv: {
    description: "Move (rename) files",
    syntax: "mv [options] source dest",
    category: "File Operations",
    options: {
      "-i, --interactive": "Prompt before overwrite",
      "-v, --verbose": "Explain what is being done",
      "-n, --no-clobber": "Do not overwrite existing files"
    },
    examples: [
      {
        command: "mv file.txt newname.txt",
        description: "Rename a file"
      },
      {
        command: "mv file.txt directory/",
        description: "Move a file to a directory"
      },
      {
        command: "mv -v *.jpg /photos/",
        description: "Move all jpg files to photos directory, showing progress"
      }
    ],
    tips: [
      "Use -i to avoid accidentally overwriting files",
      "mv can be used both to rename files and to move them",
      "Wildcards work with mv just like with cp"
    ],
    tags: ["file", "move", "rename"]
  },
  
  rm: {
    description: "Remove files or directories",
    syntax: "rm [options] file...",
    category: "File Operations",
    options: {
      "-r, --recursive": "Remove directories and their contents recursively",
      "-f, --force": "Ignore nonexistent files, never prompt",
      "-i, --interactive": "Prompt before every removal",
      "-d, --dir": "Remove empty directories"
    },
    examples: [
      {
        command: "rm file.txt",
        description: "Remove a file"
      },
      {
        command: "rm -r directory/",
        description: "Remove a directory and its contents"
      },
      {
        command: "rm -i *.tmp",
        description: "Interactively remove all .tmp files"
      }
    ],
    tips: [
      "Use with caution: rm doesn't send files to a recycle bin",
      "Use -i for interactive removal when unsure",
      "Be extremely careful with rm -rf /"
    ],
    tags: ["file", "delete", "remove"]
  },
  
  // Process management
  ps: {
    description: "Report a snapshot of current processes",
    syntax: "ps [options]",
    category: "Process Management",
    options: {
      "-e, -A": "Select all processes",
      "-f": "Full format listing",
      "-u user": "Select by effective user ID",
      "aux": "Show detailed info for all processes"
    },
    examples: [
      {
        command: "ps",
        description: "Show processes for the current shell"
      },
      {
        command: "ps aux",
        description: "Show detailed info for all processes"
      },
      {
        command: "ps -ef | grep nginx",
        description: "Find nginx processes"
      }
    ],
    tips: [
      "ps aux is one of the most common forms",
      "Combine with grep to filter for specific processes",
      "Use top for a continually updating process list"
    ],
    tags: ["process", "system", "monitor"]
  },
  
  kill: {
    description: "Send a signal to a process",
    syntax: "kill [options] pid...",
    category: "Process Management",
    options: {
      "-l": "List signal names",
      "-9": "SIGKILL (force kill)",
      "-15": "SIGTERM (graceful termination)"
    },
    examples: [
      {
        command: "kill 1234",
        description: "Terminate process with PID 1234"
      },
      {
        command: "kill -9 1234",
        description: "Force kill process with PID 1234"
      },
      {
        command: "kill -l",
        description: "List all available signals"
      }
    ],
    tips: [
      "Use kill -9 only when the process doesn't respond to normal termination",
      "Find the PID using ps, top, or pidof commands",
      "killall can be used to kill processes by name instead of PID"
    ],
    tags: ["process", "terminate", "kill"]
  },
  
  // Network commands
  curl: {
    description: "Transfer data from or to a server",
    syntax: "curl [options] [URL...]",
    category: "Network",
    options: {
      "-o, --output <file>": "Write output to file",
      "-O, --remote-name": "Write output to a local file named like the remote file",
      "-X, --request <command>": "Specify request command to use",
      "-H, --header <header>": "Pass custom header to server",
      "-d, --data <data>": "HTTP POST data"
    },
    examples: [
      {
        command: "curl https://example.com",
        description: "Fetch the content of a URL"
      },
      {
        command: "curl -o output.html https://example.com",
        description: "Save the output to a file"
      },
      {
        command: "curl -X POST -H \"Content-Type: application/json\" -d '{\"key\":\"value\"}' https://api.example.com",
        description: "Make a POST request with JSON data"
      },
      {
        command: "curl -O https://example.com/file.zip",
        description: "Download a file keeping the same name"
      }
    ],
    tips: [
      "Use -v for verbose output showing request/response headers",
      "Use -L to follow redirects",
      "Use -k to ignore SSL certificate issues (not recommended for production)",
      "Combine with jq for JSON processing"
    ],
    tags: ["network", "http", "download", "api"]
  },
  
  wget: {
    description: "Non-interactive network downloader",
    syntax: "wget [options] [URL...]",
    category: "Network",
    options: {
      "-O, --output-document=FILE": "Write documents to FILE",
      "-c, --continue": "Resume getting a partially-downloaded file",
      "-r, --recursive": "Specify recursive download",
      "-b, --background": "Go to background after startup",
      "--no-check-certificate": "Don't validate the server's certificate"
    },
    examples: [
      {
        command: "wget https://example.com/file.zip",
        description: "Download a file"
      },
      {
        command: "wget -c https://example.com/largefile.iso",
        description: "Resume downloading a file"
      },
      {
        command: "wget -r -np -l 1 https://example.com/downloads/",
        description: "Download all files from a directory"
      }
    ],
    tips: [
      "Use -c to resume interrupted downloads",
      "Use --limit-rate=1m to limit download speed",
      "Use -r -l with level number to control recursion depth",
      "For large downloads, consider using -b to run in the background"
    ],
    tags: ["network", "download", "http"]
  },
  
  // System information commands
  uname: {
    description: "Print system information",
    syntax: "uname [options]",
    category: "System",
    options: {
      "-a, --all": "Print all information",
      "-s, --kernel-name": "Print the kernel name",
      "-n, --nodename": "Print the network node hostname",
      "-r, --kernel-release": "Print the kernel release",
      "-m, --machine": "Print the machine hardware name"
    },
    examples: [
      {
        command: "uname -a",
        description: "Print all system information"
      },
      {
        command: "uname -s",
        description: "Print only the kernel name"
      },
      {
        command: "uname -r",
        description: "Print the kernel release version"
      }
    ],
    tips: [
      "Use -a to get all system information at once",
      "Combine with grep to filter for specific information",
      "For more detailed information, check /proc/version"
    ],
    tags: ["system", "info", "kernel"]
  },
  
  df: {
    description: "Report file system disk space usage",
    syntax: "df [options] [file...]",
    category: "System",
    options: {
      "-h, --human-readable": "Print sizes in human readable format",
      "-T, --print-type": "Print file system type",
      "-i, --inodes": "List inode information instead of block usage",
      "-a, --all": "Include pseudo, duplicate, inaccessible file systems"
    },
    examples: [
      {
        command: "df -h",
        description: "Show disk space in human-readable format"
      },
      {
        command: "df -hT",
        description: "Show disk space and file system type"
      },
      {
        command: "df -h /dev/sda1",
        description: "Show information for a specific device"
      }
    ],
    tips: [
      "Always use -h for human-readable sizes",
      "Use -T to see the file system type as well",
      "Check specific mount points by providing them as arguments"
    ],
    tags: ["disk", "storage", "system"]
  },
  
  du: {
    description: "Estimate file space usage",
    syntax: "du [options] [file...]",
    category: "System",
    options: {
      "-h, --human-readable": "Print sizes in human readable format",
      "-s, --summarize": "Display only a total for each argument",
      "-c, --total": "Produce a grand total",
      "-d, --max-depth=N": "Print the total for a directory only if it is N or fewer levels below"
    },
    examples: [
      {
        command: "du -h",
        description: "Show disk usage of current directory in human-readable format"
      },
      {
        command: "du -sh *",
        description: "Summarize disk usage of each item in current directory"
      },
      {
        command: "du -h --max-depth=1",
        description: "Show disk usage of immediate subdirectories only"
      }
    ],
    tips: [
      "Combine du -sh * to quickly see what's using disk space",
      "Use --max-depth=1 to avoid recursing too deep into directories",
      "Sort output with sort -h for a ranked list of disk usage"
    ],
    tags: ["disk", "storage", "system"]
  },
  
  // Package management
  npm: {
    description: "Node Package Manager",
    syntax: "npm <command> [args]",
    category: "Package Management",
    options: {
      "install, i": "Install a package",
      "uninstall, remove, rm": "Remove a package",
      "update, up": "Update packages",
      "list, ls": "List installed packages",
      "init": "Create a package.json file",
      "run": "Run a script defined in package.json"
    },
    examples: [
      {
        command: "npm install package-name",
        description: "Install a package locally"
      },
      {
        command: "npm install -g package-name",
        description: "Install a package globally"
      },
      {
        command: "npm install --save-dev package-name",
        description: "Install a package as a dev dependency"
      },
      {
        command: "npm run start",
        description: "Run the start script defined in package.json"
      }
    ],
    tips: [
      "Use npm ci for clean installations in CI environments",
      "Use package-lock.json for deterministic builds",
      "Use npm audit to check for vulnerabilities",
      "Use npx to run packages without installing them globally"
    ],
    tags: ["node", "javascript", "package", "npm"]
  },
  
  yarn: {
    description: "Fast, reliable, and secure dependency management",
    syntax: "yarn <command> [args]",
    category: "Package Management",
    options: {
      "add": "Add a package to use in your current package",
      "remove": "Remove a package from your current package",
      "install": "Install all dependencies for a project",
      "up, upgrade": "Upgrade packages to their latest version",
      "init": "Initialize a new package",
      "run": "Run a script defined in package.json"
    },
    examples: [
      {
        command: "yarn add package-name",
        description: "Add a package as a dependency"
      },
      {
        command: "yarn add package-name --dev",
        description: "Add a package as a dev dependency"
      },
      {
        command: "yarn install",
        description: "Install all dependencies from package.json"
      },
      {
        command: "yarn run start",
        description: "Run the start script defined in package.json"
      }
    ],
    tips: [
      "Use yarn.lock for deterministic builds",
      "yarn install is faster than npm install",
      "Use yarn upgrade-interactive for an interactive upgrade experience",
      "Use yarn why to understand why a package is installed"
    ],
    tags: ["node", "javascript", "package", "yarn"]
  },
  
  // Docker commands
  "docker ps": {
    description: "List containers",
    syntax: "docker ps [options]",
    category: "Container Management",
    options: {
      "-a, --all": "Show all containers (default shows just running)",
      "-q, --quiet": "Only display container IDs",
      "-s, --size": "Display total file sizes",
      "--filter": "Filter output based on conditions provided"
    },
    examples: [
      {
        command: "docker ps",
        description: "List running containers"
      },
      {
        command: "docker ps -a",
        description: "List all containers, including stopped ones"
      },
      {
        command: "docker ps -q",
        description: "List only container IDs"
      }
    ],
    tips: [
      "Use docker ps -a to see stopped containers",
      "Combine with grep to filter for specific containers",
      "Use --format to customize the output format"
    ],
    tags: ["docker", "container", "list"]
  },
  
  "docker run": {
    description: "Run a command in a new container",
    syntax: "docker run [options] image [command] [arg...]",
    category: "Container Management",
    options: {
      "-d, --detach": "Run container in background",
      "-p, --publish": "Publish a container's port(s) to the host",
      "-v, --volume": "Bind mount a volume",
      "-e, --env": "Set environment variables",
      "--name": "Assign a name to the container",
      "--rm": "Automatically remove the container when it exits"
    },
    examples: [
      {
        command: "docker run -it ubuntu bash",
        description: "Run an interactive bash shell in an Ubuntu container"
      },
      {
        command: "docker run -d -p 8080:80 nginx",
        description: "Run Nginx in the background, mapping port 8080 to container port 80"
      },
      {
        command: "docker run --rm alpine echo \"Hello World\"",
        description: "Run a command and remove the container afterward"
      }
    ],
    tips: [
      "Use -it for interactive processes like shells",
      "Use -d to run containers in the background",
      "Always consider using --rm for temporary containers",
      "Use named volumes instead of bind mounts for persistent data"
    ],
    tags: ["docker", "container", "run"]
  },
  
  "docker build": {
    description: "Build an image from a Dockerfile",
    syntax: "docker build [options] path | URL | -",
    category: "Container Management",
    options: {
      "-t, --tag": "Name and optionally a tag in the 'name:tag' format",
      "-f, --file": "Name of the Dockerfile",
      "--no-cache": "Do not use cache when building the image",
      "--pull": "Always attempt to pull a newer version of the base image"
    },
    examples: [
      {
        command: "docker build -t myapp:latest .",
        description: "Build an image from the Dockerfile in the current directory"
      },
      {
        command: "docker build -f Dockerfile.dev -t myapp:dev .",
        description: "Build using a specific Dockerfile"
      },
      {
        command: "docker build --no-cache -t myapp:fresh .",
        description: "Build without using the cache"
      }
    ],
    tips: [
      "Always tag your images with meaningful names",
      "Use .dockerignore to exclude files from the build context",
      "Build with --no-cache when you suspect cache issues",
      "Use multi-stage builds to create smaller production images"
    ],
    tags: ["docker", "image", "build"]
  }
};
