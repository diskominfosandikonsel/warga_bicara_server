const sharp = require('sharp');
const fs = require('fs');

const resizeImg = (file) => {

    const inputFile     = 'uploads/'+file;
    const outputFile    = 'uploads/thumbnail'+file;

    return new Promise((resolve, reject)=>{
        sharp(inputFile).resize({ width: 250 }).toFile(outputFile)
        .then(function(newFileInfo) {
            // newFileInfo holds the output file properties
            console.log("Success")
            resolve('')
        })
        .catch(function(err) {
            console.log("Error occured");
            resolve('')
        });
    })

}

const hapus_file = (file) => {
    const path = 'uploads/'+file;

    

    fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
    })
}







module.exports = {
    resizeImg : resizeImg,
    hapus_file : hapus_file,
}
