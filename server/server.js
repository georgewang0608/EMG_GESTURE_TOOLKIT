const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const unzipper = require('unzipper');
// const AdmZip = require('adm-zip');
const fs_extra = require('fs-extra');

// const sanitizeFilename = require('sanitize-filename');


const app = express();
app.use(cors());

const createDirectory = (directoryPath) => {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
      console.log(`Directory created: ${directoryPath}`);
    }
};

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // const patientId = req.body.patientId;
        const uploadPath = `./uploads/`;
        // createDirectory(uploadPath); // Create the directory if it doesn't exist
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});
  
const upload = multer({ storage: storage });

app.post('/api/uploadfile', upload.single('myFile'), function(req, res, next) {
    const file = req.file;
    const participantID = req.body.participantID;
    const order = req.body.order;
    const frequency = req.body.frequency;
    const samp_frequency = req.body.samp_frequency;
    const window = req.body.window;
    const overlap = req.body.overlap;
    const movavg_fs = req.body.movavg_fs;
    // console.log(req);
    if (!file) {
        const error = new Error('Please upload a file');
        error.httpStatusCode = 400;
        return next(error);
    }
    // console.log(file.originalname);
    if (file.mimetype !== 'application/zip') {
        // console.log(path.parse(file.originalname).name);
        fs.unlinkSync(file.path); // Delete the uploaded file
        return res.status(500).send({ message: 'Please upload a zip file' });
    }

    const uploadPath = `./uploads/${participantID}/`;
    createDirectory(uploadPath);

    fs.rename(file.path, uploadPath + `${file.originalname}`, function(err) {
        if (err) {
            console.error(err);
            return res.status(500).send(err);
        }
    });

    console.log(uploadPath + `${file.originalname}`);
    const zipFilePath = path.join(uploadPath, `${file.originalname}`);
    // zip.extractAllTo(uploadPath, true);
    // fs.unlinkSync(uploadPath + `${file.originalname}`);
    fs.createReadStream(zipFilePath)
    .pipe(unzipper.Extract({ path: uploadPath }))
    .on('close', function () {
        const pythonScriptPath = './processdata.py';
        console.log(participantID)
        const pythonProcess = spawn('/Users/test/opt/anaconda3/bin/python', [pythonScriptPath, participantID, order, frequency, samp_frequency, window, overlap, movavg_fs]);
        pythonProcess.stdout.on('data', function(data) {
            console.log(data.toString()); 
        });
        
        pythonProcess.stderr.on('data', function(data) {
            console.error(data.toString());
        });
        pythonProcess.on('exit', function(code) {
            console.log("Exited with code " + code);
        });
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                const movavgFolderPath = `./${participantID}/movavg_files/`;
                const processedFiles = fs.readdirSync(movavgFolderPath);
                fs.unlinkSync(uploadPath + `${file.originalname}`);
                console.log(processedFiles)
                // const zip = new AdmZip();
                // processedFiles.forEach((processedFile) => {
                // const filePath = path.join(movavgFolderPath, processedFile);
                // const fileData = fs.readFileSync(filePath);
                // zip.addFile(processedFile, fileData);
                // });
                const zipFile = `${path.parse(file.originalname).name}_movavg.zip`;
                const filePath = path.join(`./${participantID}/movavg_files/`, zipFile); // Replace 'processed_file' with the actual filename
                const output = fs.createWriteStream(filePath);
                // zip.writeZip(filePath);
                const archive = archiver('zip', { zlib: { level: 9 } });
                output.on('close', function () {
                    console.log(archive.pointer() + ' total bytes');
                    console.log('archiver has been finalized and the output file descriptor has closed.');
                  });
                archive.pipe(output);

                // Read the directory and add files to the archive
                fs.readdir(`./${participantID}/movavg_files/`, function (err, files) {
                if (err) {
                    throw err;
                }
                
                files.forEach(function (file) {
                    const filePath = path.join(`./${participantID}/movavg_files/`, file);
                
                    // Add the file to the archive with a custom name
                    archive.file(filePath, { name: file });
                });
                
                // Finalize the archive to complete the zipping process
                archive.finalize();
                });
            // const fileData = fs.readFileSync(filePath);
                console.log(zipFile);
                // Set the appropriate headers for the download
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename=${zipFile}`);
                // Send the file data in the response
                // res.send(fileData);
                  // Stream the zipped file to the response
                const fileStream = fs.createReadStream(filePath);
                fileStream.pipe(res);
                fs_extra.removeSync(`./${participantID}`);
                fs_extra.removeSync(`./uploads/${participantID}`);
            } else {
            res.status(500).send({ message: 'Error occurred during processing' });
            }
        });
    });

    // res.send(file);
});

  
const port = process.env.PORT || 3000;
app.listen(port, function() {
    console.log(`Server started on port ${port}`);
});