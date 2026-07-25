import http from 'http'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream'

const port = 8000

// MIME types for header
const MIME_TYPES = {
  default: 'application/octet-stream',
  json: 'application/json',
  text: 'text/plain',
  html: 'text/html; charset=UTF-8',
  js: 'text/javascript',
  css: 'text/css',
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
};

// Static path to point to root directory where server is being run
const STATIC_PATH = path.join(process.cwd(), './')

const server = http.createServer(async (req, res) => {
  // url found in req.url
  const url = req.url

  // decode the URI into readable url as the directory path
  const urlAsPath = decodeURI(url)
  
  // array of paths to be appending into the file path later
  const paths = [STATIC_PATH, urlAsPath]
  
  // if root path then serve index.html file
  if (url.endsWith('/')) paths.push('index.html')
  
  // create actual file path via join from the above paths array
  const filePath = path.join(...paths)

  // check for directory traversal attack, immediately end processing if found by writing headers then ending process
  if (!filePath.startsWith(STATIC_PATH)) res.writeHead(403, 'Forbidden', { 'content-type': MIME_TYPES.json }).end(JSON.stringify({ message: 'Forbidden' }))

  // check if the file exists AND you have "some" access to viewing it then return true if it does and false if it doesn't
  const exists = await fs.promises.access(filePath).then(() => true).catch(() => false)

  // set default statusCode to be optimistic (success) and streamPath to be optimistic (filePath)
  let statusCode = 200;
  let streamPath = filePath

  // if file does not exist re-set statusCode and streamPath to 404
  if (!exists) {
    statusCode = 404
    streamPath = `${STATIC_PATH}/404.html`
  }

  // get extension name from streamPath, substring(1) strips '.' before extension name, and sets to lowercase for reading
  const ext = path.extname(streamPath).substring(1).toLowerCase()

  // create readable stream object, this lets nodejs read the file in chunks instead of all at once
  const fileStream = fs.createReadStream(streamPath)

  // write headers based on previously set variables
  res.writeHead(statusCode, { 'content-type': MIME_TYPES[ext] || MIME_TYPES.default })

  // create pipeline from nodejs internal stream package which pipes streams together and allows for explicit error handling and implicit resource cleanup
  // in this case, the fileStream data is being piped to the response, if an error occurs during that process then the process will end with the error message
  await pipeline(fileStream, res, (err) => {
    if (err) {
      console.error('File stream pipeline failed:', err)
      res.end('Error streaming file.')
    }
  })
  console.log(`${req.method} ${req.url} ${statusCode}`)
})

server.listen(port)

console.log(`Server is listening on port ${port}...`)