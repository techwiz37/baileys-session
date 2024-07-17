[![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png)](#table-of-contents)
# Baileys Session (Firebase)
> multi session baileys created on firebase databases

[JOIN GROUP](https://chat.whatsapp.com/JbzMsezhCwUKdC6dnjwcIz)

## how to use ?
> First, you need to add the session package in package.json. You can use the github or npm version

**version github**
```json
"session": "github.com/amiruldev20/baileys-session#firebase"
```

**version npm**
```json
"session": "npm:baileys-firebase"
```

```json
{
    "name": "myproject",
    "version": "1.0.1",
    "author": "Sherly",
    "dependencies": {
        "session": "github:amiruldev20/baileys-session#firebase"
        // and other your depen
    }
}
```

> Second step, please call the useFireAuthState function on your client. Example code is below

```javascript
// for esm import
import { useFireAuthState } from "session"

// for cjs import
const { useFireAuthState } = require("session")

// next code (support all)
const { state, saveCreds, clear, removeCreds, query } =
    await useFireAuthState({})
```

**Note:**
> If there are bugs, please report & open an issue in the main repo.
