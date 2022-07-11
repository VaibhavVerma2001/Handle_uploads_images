const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const path = require('path');


// we will handle uploads using -- https://www.npmjs.com/package/multer
// NOTE: Multer will not process any form which is not multipart (multipart/form-data).
const multer = require('multer');

//delete files using -- https://www.npmjs.com/package/method-override
const methodOverride = require("method-override");
//delete images from system using fs
const fs = require('fs');


const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static("public"));


const URL = "mongodb://localhost:27017/FileDB";
mongoose.connect(URL);

mongoose.connection
    .once('open', function () {
        console.log('Successfully connected to Database ...');
    })
    .on('error', function (err) {
        console.log(err);
});

const imageSchema = new mongoose.Schema({
    imageUrl: String
});

const Image = mongoose.model("Image", imageSchema);


//middle ware for method override
app.use(methodOverride('_method'));

//set image storage
let storage = multer.diskStorage({
    //destination 
    destination: "./public/uploads/images/",
    //file name -- as it is in computer
    //cb means callback
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
});

let upload = multer({
    // storage
    storage: storage,
    //this will help to filter our file
    fileFilter: (req, file, cb) => {
        checkFileType(file, cb);
    }
});



//create seperate function to handle what type of file user can upload -- example images
function checkFileType(file, cb) {
    //specify file(extentions) types in "//"
    const fileTypes = /jpeg|jpg|png|gif/;
    // test that uploaded file is of same type
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    //this method with return true or false if extention matches

    if (extname) {
        return cb(null, true);
    }
    else {
        cb("Error: Please upload images only");
    }
}

app.get("/", (req, res) => {
    Image.find({}, function (err, images) {
        if (err) {
            console.log(err);
        }
        else {
            res.render("index", { images: images });
        }
    });
});


app.get("/upload", (req, res) => {
    res.render("upload");
});




// handle post requests with middleware
app.post("/uploadSingle", upload.single("singleImage"), (req, res) => {
    const file = req.file; // the file user uploads
    // console.log(file);
    if (!file) {
        console.log("Please select an image");
        res.redirect("/upload");
    }
    else {
        // console.log(file.path); //path of file where it is stored

        //build url we want to store
        let url = file.path.replace('public', ''); //if we specified public in ap.use static then remove public from here , otherwise we will not be able to see images on our browser
        // console.log(url);

        //ensure there is no duplicate file with same name

        Image.findOne({ imageUrl: url }, function (err, img) {
            if (err) {
                console.log(err);
            }
            else {
                if (img) {
                    console.log("Duplicate image, Try again!");
                    res.redirect("/upload");
                }
                else {
                    Image.create({ imageUrl: url }, function (err) {
                        if (!err) {
                            console.log("Image saved to DB");
                            res.redirect("/");
                        }
                        else {
                            console.log(err);
                        }
                    });
                }
            }
        });
    }
});


// for multiple uploads
app.post('/uploadMultiple', upload.array('multipleImages'), (req, res, next) => {
    const files = req.files;
    if (files.length === 0) {
        console.log('Please select images.');
        res.redirect("/upload");
    }
    else {
        //because there are multiple images , so use loops
        files.forEach(function (file) {
            let url = file.path.replace('public', '');

            Image.findOne({ imageUrl: url })
                .then(async img => {
                    if (img) {
                        console.log('Duplicate Image is not saved.');
                    }
                    else {
                        await Image.create({ imageUrl: url });
                    }
                })
                .catch(err => {
                    console.log('ERROR: ' + err);
                })
        });
        res.redirect('/');
    }

});


// DELETE PART 
// NOTE -- WE DONT WANT TO JUST DELETE THE URL FROM DB BUT ALSO DELETE THE PICTURE
//use method unlink for that

app.delete("/delete/:imgId", (req, res) => {
    let id = req.params.imgId;

    // 1st find image in system , if found then delete that 1st , after image get deleted successfully from system after that delete from mongoDB
    Image.findOne({ _id: id }, function (err, img) {
        // it will help to delete file, 1st path of file then callback --  add public be we havent added public in url
        fs.unlink(__dirname + "/public" + img.imageUrl, function (err) {
            if (err) {
                console.log(err);
            }
            else {
                Image.deleteOne({ _id: id }, function (err) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        console.log("Image deleted successfully");
                        res.redirect("/");
                    }
                });
            }
        });
    });
});

const port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log(`Server connected successfully on port ${port}...`);
});