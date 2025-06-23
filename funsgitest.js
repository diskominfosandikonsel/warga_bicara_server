const {getCollection} = require('../../db/mongodb/controller')

const users = await getCollection('users');

async function viewFunc (){

}

async function createFunc (){
    const results = await users.insertOne(form)
}

async function updateFunc (){
    const users = await getCollection('users');
    const result = await users.updateOne({ id: req.body.id }, 
        { $set: {
                username                    : req.body.username,  
        } });
        if (result.acknowledged) {
            console.log(result);
            res.status(200).json({
                message: "Data berhasil diupdate"
            });
        } else {
            res.status(500).json({
                message: "Data gagal diupdate"
            });
        }
}

async function deleteFunc (){
        const users = await getCollection('users');  
        const result = await users.deleteOne({ id: req.body.id });
}