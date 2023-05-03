const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');


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
    const patientId = req.body.patientId;
    console.log(req);
    if (!file) {
        const error = new Error('Please upload a file');
        error.httpStatusCode = 400;
        return next(error);
    }

    const uploadPath = `uploads/${patientId}/`;
    createDirectory(uploadPath);

    fs.rename(file.path, uploadPath + `${file.originalname}`, function(err) {
        if (err) {
            console.error(err);
            return res.status(500).send(err);
        }
    });

    const pythonScriptPath = './processdata.py';
    console.log(patientId)
    const pythonProcess = spawn('/Users/test/opt/anaconda3/bin/python', [pythonScriptPath, patientId]);
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
            const filePath = path.join(`./${patientId}/movavg_files/`, `${path.parse(uploadPath + `${file.originalname}`).name}_movavg.csv`); // Replace 'processed_file' with the actual filename
            console.log(filePath);
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading file:', err);
                    res.status(500).send({ message: 'Error occurred during processing' });
                } else {
                    res.send({ fileData: data, fileName: filePath });
                }
              });
        } else {
          res.status(500).send({ message: 'Error occurred during processing' });
        }
    });


    // res.send(file);
});

  
const port = process.env.PORT || 3000;
app.listen(port, function() {
    console.log(`Server started on port ${port}`);
});