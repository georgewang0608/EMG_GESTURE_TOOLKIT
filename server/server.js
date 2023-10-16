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
const { stringify } = require('querystring');
const { env } = require('process');
const { promisify } = require('util')


// const sanitizeFilename = require('sanitize-filename');


const app = express();
app.use(cors());

const createDirectory = async (directoryPath) => {
    if (!fs.existsSync(directoryPath)) {
      await fs.promises.mkdir(directoryPath, { recursive: true });
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

const extractAndProcessFiles = async (res, uploadPath, file, participantID, order, frequency, samp_frequency, window, overlap, movavg_fs) => {
    try {
      const zipFilePath = uploadPath + '' + file.originalname;
      console.log(zipFilePath);
      await unzipper.Open.file(zipFilePath)
        .then(async (archive) => {
          await archive.extract({ path: uploadPath });
          console.log("2");
          const pythonScriptPath = './processdata.py';
          console.log(participantID);
          const pythonProcess = spawn('/Users/test/opt/anaconda3/bin/python', [pythonScriptPath, participantID, order, frequency, samp_frequency, window, overlap, movavg_fs]);
  
          pythonProcess.stdout.on('data', function(data) {
            console.log(data.toString()); 
          });
  
          pythonProcess.stderr.on('data', function(data) {
            console.error(data.toString());
          });
  
          await new Promise((resolve) => {
            pythonProcess.on('exit', resolve);
          });
  
          console.log("Exited with code " + pythonProcess.exitCode);
  
          if (pythonProcess.exitCode === 0) {
            console.log("start zipping file")
            const movavgFolderPath = `./${participantID}/movavg_files/`;
            const processedFiles = await fs.promises.readdir(movavgFolderPath);
            // await fs.promises.unlink(movavgFolderPath);
            console.log(processedFiles);
  
            const zipFile = `${path.parse(file.originalname).name}_movavg.zip`;
            console.log("3");
            const filePath = path.join(`./${participantID}/movavg_files/`, zipFile);
            console.log(filePath);
  
            const output = fs.createWriteStream(filePath);
            const archive = archiver('zip', { zlib: { level: 9 } });
            let isComplete = false;

            output.on('close', async function () {
              isComplete = true;
              console.log(archive.pointer() + ' total bytes');
              console.log('archiver has been finalized and the output file descriptor has closed.');
            //   const fileData = fs.readFileSync(filePath);
              const stat = fs.statSync(filePath);
              res.setHeader('Content-Type', 'application/zip');
              res.setHeader('Content-Length', stat.size);
              res.setHeader('Content-Disposition', `attachment; filename="${zipFile}"`);
              res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${zipFile}"`,
                'Content-Length': stat.size,
              });
              console.log(stat.size);
              const fileStream = fs.createReadStream(filePath);
              await fileStream.pipe(res);
              res.on('finish', async () => {
                // Streaming process is complete
                console.log('File streaming to response finished.');
                // await fs.promises.unlink(`./${participantID}`);
                // await fs.promises.unlink(`./uploads/${participantID}`);
                console.log('File directory successfully deleted');
                fs.rmSync(`./uploads/${participantID}`, { recursive: true, force: true });
                fs.rmSync(`./${participantID}`, { recursive: true, force: true });
                res.end();
              });
            //   res.send(fileData);
            //   fs_extra.removeSync(`./${participantID}`);
            //   fs_extra.removeSync(`./uploads/${participantID}`);
            });
  
            archive.pipe(output);
  
            fs.readdir(`./${participantID}/movavg_files/`, async function (err, files) {
              if (err) {
                throw err;
              }
  
              files.forEach(function (file) {
                if (file.endsWith("csv")) {
                  const filePath = path.join(`./${participantID}/movavg_files/`, file);
                  archive.file(filePath, { name: file });
                }
              });
  
              await archive.finalize();

              while (!isComplete) {
                console.log("waiting...");
                await new Promise((resolve) => {
                  setTimeout(resolve, 100);
                });
              }
              // delete the files here:
              // fs.rmSync(`./uploads/${participantID}`, { recursive: true, force: true });
              // fs.rmSync(`./${participantID}`, { recursive: true, force: true });
            });
          } else {
            fs.rmSync(`./uploads/${participantID}`, { recursive: true, force: true });
            console.log('wrong')
            console.log(`./uploads/${participantID}`)
            res.status(500).send({ message: 'Error occurred during processing' });
          }
        })
        .catch((error) => {
          fs.rmSync(`./uploads/${participantID}`, { recursive: true, force: true });
          console.error('An error occurred while extracting the archive:', error);
          res.status(500).send({ message: 'Error occurred during processing' });
        });
    } catch (error) {
      fs.rmSync(`./uploads/${participantID}`, { recursive: true, force: true });
      console.error('An error occurred:', error);
      res.status(500).send({ message: 'Error occurred during processing' });
    }
  };
  

app.post('/api/uploadfile', upload.single('myFile'), async function(req, res, next) {
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
        await fs.promises.unlinkSync(file.path); // Delete the uploaded file
        return res.status(500).send({ message: 'Please upload a zip file' });
    }

    const uploadPath = `./uploads/${participantID}/`;
    await createDirectory(uploadPath);

    fs.promises.rename(file.path, uploadPath + `${String(file.filename)}`, function(err) {
        if (err) {
            console.error(err);
            return res.status(500).send(err);
        }
    }).then(extractAndProcessFiles(res, uploadPath, file, participantID, order, frequency, samp_frequency, window, overlap, movavg_fs)
    );

    // console.log(uploadPath + `${file.originalname}`);
    // const zipFilePath = uploadPath + '' + file.originalname;
    // console.log(zipFilePath);
    // console.log("1");

    // extractAndProcessFiles(res, uploadPath, file, participantID, order, frequency, samp_frequency, window, overlap, movavg_fs)
    // .then(() => {
    //   // Handle the success response
    //   res.send({ message: 'Files processed successfully.' });
    // })
    // .catch((error) => {
    //   // Handle the error response
    //   console.error('An error occurred during file processing:', error);
    //   res.status(500).send({ message: 'Error occurred during file processing.' });
    // });
});

process.env.PORT = 3001

const port = process.env.PORT || 3000;
app.listen(port, function() {
    console.log(`Server started on port ${port}`);
});