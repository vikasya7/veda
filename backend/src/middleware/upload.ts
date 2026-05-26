import multer, {FileFilterCallback} from 'multer'
import path from 'path'
import fs from 'fs'

const UPLOAD_DIR=path.resolve('uploads');
if(!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR,{recursive:true})


    const storage=multer.diskStorage({
        destination:(_req,_file,cb)=>cb(null,UPLOAD_DIR),
        filename:(_req,file,cb)=>{
            const ext=path.extname(file.originalname).toLowerCase()
            const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            cb(null, `${unique}${ext}`);
        }
    })


    function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb:   FileFilterCallback
): void {
  const allowed = ['.pdf', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  allowed.includes(ext)
    ? cb(null, true)
    : cb(new Error(`Only PDF and TXT files allowed. Got: ${ext}`));
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB hard cap
});