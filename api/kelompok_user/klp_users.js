const express = require('express')
const router = express.Router()
const {getCollection} = require('../../db/mongodb/controller') 
const uniqid = require('uniqid')
const { ObjectId } = require('mongodb')



router.post('/viewData', async (req, res, next) => {  

    const menu_klp = await getCollection('menu_klp'); //memilih collection yang mau di query
    const result = await menu_klp.find().sort({urutan:1}).toArray(); //query cari data
    if (result.length <= 0) {
        res.status(404).json({ message: "Data tidak ditemukan" })
    } else {
        res.send({
            data:result
        })
    }
})

router.post('/addData', async (req, res, next) => {
    
    const datax = req.body.data; 
    const id_klp = datax.id;
    const list_menux = req.body.list_menu; 
    const data = flattenMenu(list_menux); // Dijadikan satu level


    var akses_menu = req.menu_akses
    const levelAkses = akses_menu.find(({ route }) => route === '/KlpUser');
    
    if (levelAkses.addx == 1) {
        
        const menu_klp = await getCollection('menu_klp')
        const result = await menu_klp.insertOne({id:id_klp, uraian:datax.uraian})
     
        
        if (result.acknowledged === true) { 
             
    
            const menu_klp_list = await getCollection('menu_klp_list');
    
            const dataInsert = data.map(element => ({
                id: uniqid(),
                menu_id: element.id,
                menu_klp_id: id_klp,
                readx: element.readx,
                updatex: element.updatex,
                deletex: element.deletex,
                addx: element.addx
            }));
    
            const resultx = await menu_klp_list.insertMany(dataInsert);
            if (resultx.acknowledged) {
                console.log(`${resultx.insertedCount} data berhasil ditambahkan.`);
            } else {
                console.log("InsertMany menu_klp_list gagal.");
            } 
    
            res.send({ message: "Data menu klp list berhasil ditambahkan" });
    
        }else{
            console.log("Data kelompok gagal ditambahkan"); 
            return res.status(500).json({ message: "Data kelompok gagal ditambahkan" });
        } 
        
        
    }    
    


    
})

function flattenMenu(items, result = []) {
  items.forEach(item => {
    const { child, ...rest } = item; // pisahkan child, Ambil child & sisanya
    result.push(rest);               // tambahkan data tanpa child , Simpan item tanpa child
    if (Array.isArray(child)) {
      flattenMenu(child, result);    // proses rekursif jika ada anak
    }
  });
  return result;
}

router.post('/listMenuEdit', async (req, res, next) => { //dipakai untuk memunculkan list menu berdasarkan id kelompok 
    const data = req.body.data; 

    const req_id = data.id; // ambil id kelompok dari body request 
    const menuCollection = await getCollection('menu');

    const result = await menuCollection.aggregate([
    {
        $lookup: {
        from: 'menu_klp_list',
        let: { menuId: '$id' },
        pipeline: [
            {
            $match: {
                $expr: {
                $and: [
                    { $eq: ['$menu_id', '$$menuId'] },
                    { $eq: ['$menu_klp_id', req_id] }
                ]
                }
            }
            },
            { $limit: 1 } // ambil satu saja karena LEFT JOIN
        ],
        as: 'menu_klp_data'
        }
    },
    {
        $unwind: {
        path: '$menu_klp_data',
        preserveNullAndEmptyArrays: true // ini yang bikin LEFT JOIN
        }
    },
    {
        $addFields: {
        menu_klp_list_id: '$menu_klp_data.id',
        readx: { $ifNull: ['$menu_klp_data.readx', false] },
        updatex: { $ifNull: ['$menu_klp_data.updatex', false] },
        deletex: { $ifNull: ['$menu_klp_data.deletex', false] },
        addx: { $ifNull: ['$menu_klp_data.addx', false] }
        }
    },
    {
        $project: {
        menu_klp_data: 0 // sembunyikan join-an mentah
        }
    },
    {
        $sort: {
        urutan: 1 // urut berdasarkan menu.urutan
        }
    }
    ]).toArray();

    const nest = (items, id = null, link = 'parent') =>
    items
        .filter(item => item[link] === id)
        .map(item => {
        const children = nest(items, item.id, link);
        return {
            ...item,
            ...(children.length > 0 && { child: children }) // hanya tambahkan jika tidak kosong
        };
    });            
    res.send(nest(result)) 
    
    
 
})


// =====================

router.post('/editData', async (req, res, next) => { 
    const data = req.body.data;
    const list_menu = req.body.list_menu;

    const hasil_list_menu = flattenMenu(list_menu);

    const response = {
        menu_klp: {},
        menu_klp_list: {}
    };

    const req_id = data.id; // ambil id kelompok dari body request 
    const menuCollection = await getCollection('menu');

    var akses_menu = req.menu_akses
    const levelAkses = akses_menu.find(({ route }) => route === '/KlpUser');
    
    if (levelAkses.updatex == 1) {
        // console.log('levelAkses.updatex == 1');
        // console.log(levelAkses.updatex);
        
        try {
            const menu_klp = await getCollection('menu_klp');
            const result = await menu_klp.updateOne(
                { id: data.id },
                { $set: { uraian: data.uraian } }
            );
    
            if (!result.acknowledged) {
                response.menu_klp.message = "Data kelompok gagal diupdate";
            } else {
                response.menu_klp.message = "Data kelompok berhasil diupdate";
            }
    
            const menu_klp_list = await getCollection('menu_klp_list');
    
            const bulkOps = hasil_list_menu.map(element => {
            const isNew = !element.menu_klp_list_id || element.menu_klp_list_id === '';
            const menu_klp_list_id = isNew ? uniqid() : element.menu_klp_list_id;
    
            return {
                updateOne: {
                filter: { id: menu_klp_list_id },
                update: {
                    $set: {
                    id: menu_klp_list_id,
                    menu_id: element.id,
                    menu_klp_id: data.id,
                    readx: element.readx,
                    updatex: element.updatex,
                    deletex: element.deletex,
                    addx: element.addx
                    }
                },
                upsert: true
                }
            };
            });
    
            const hasil_bulkWrite = await menu_klp_list.bulkWrite(bulkOps);
    
            response.menu_klp_list.insertedCount = hasil_bulkWrite.upsertedCount;
            response.menu_klp_list.updatedCount = hasil_bulkWrite.modifiedCount;
    
            const total = hasil_bulkWrite.modifiedCount + hasil_bulkWrite.upsertedCount;
    
            let messageParts = [];
    
            if (result.acknowledged) {
                messageParts.push("Data kelompok berhasil diupdate");
            } else {
                messageParts.push("Data kelompok gagal diupdate");
            }
    
            if (total > 0) {
                messageParts.push(`${total} data menu_klp_list berhasil diupdate atau ditambahkan`);
            } else {
                messageParts.push("Tidak ada perubahan data menu_klp_list");
            }
    
            res.status(200).json({ message: messageParts.join(". ") + "." });
    
    
        } catch (err) {
            console.error("Error saat editData:", err);
            res.status(500).json({ message: "Terjadi kesalahan saat memproses data.", error: err.message });
        }
    }


})

router.post('/removeData', async (req, res, next) => {
    const data = req.body.data;
    console.log(data);

    var akses_menu = req.menu_akses
    const levelAkses = akses_menu.find(({ route }) => route === '/KlpUser');

    if (levelAkses.deletex == 1) { 
        
        const menu_klp = await getCollection('menu_klp');
        const menu_klp_list = await getCollection('menu_klp_list');
    
        const resultKlp = await menu_klp.deleteOne({ id: data.id });
        const resultList = await menu_klp_list.deleteMany({ menu_klp_id: data.id });
    
        let message = [];
    
        if (resultKlp.deletedCount > 0) {
        message.push("Data kelompok berhasil dihapus");
        } else {
        message.push("Data kelompok tidak ditemukan");
        }
    
        if (resultList.deletedCount > 0) {
        message.push(`${resultList.deletedCount} data menu kelompok list berhasil dihapus`);
        } else {
        message.push("Tidak ada data menu kelompok list yang dihapus");
        }
    
        res.status(200).json({ message: message.join(". ") + "." }); 
    }

})


router.get('/listMenu', async (req, res, next) => {
    console.log("listMenu");
    
    // const data = req.body;
    const listMenu = await getCollection('menu'); 
    const result = await listMenu.aggregate([
            {
                $addFields: {
                    readx   : true,
                    updatex : true,
                    deletex : true,
                    addx    : true
                }
            },
            {
                $sort: { urutan: 1 }
            }
        ]).toArray(); 

            const nest = (items, id = null, link = 'parent') =>
            items
                .filter(item => item[link] === id)
                .map(item => {
                const children = nest(items, item.id, link);
                return {
                    ...item,
                    ...(children.length > 0 && { child: children }) // hanya tambahkan jika tidak kosong
                };
                });
            res.send(nest(result))
            
})

router.post('/autocomplete', async (req, res, next) => {  
    const menu_klp = await getCollection('menu_klp'); //memilih collection yang mau di query
    const result = await menu_klp.find().sort({urutan:1}).toArray(); //query cari data
    if (result.length <= 0) {
        res.status(404).json({ message: "Data tidak ditemukan" })
    } else {
        res.send({
            data:result
        })
    }
})


router.post('/listSidebar', async(req, res, next) =>{
    const klpId = req.user?.auth?.authorization;
    if (!klpId) {
        return res.status(401).json({ message: 'Authorization kelompok tidak ditemukan' });
    }

    const menuCollection = await getCollection('menu');

    const result = await menuCollection.aggregate([
    {
        $lookup: {
        from: 'menu_klp_list',
        let: { menuId: '$id' },
        pipeline: [
            {
            $match: {
                $expr: {
                $and: [
                    { $eq: ['$menu_id', '$$menuId'] },
                    { $eq: ['$menu_klp_id', klpId] }
                ]
                }
            }
            },
            { $limit: 1 } // ambil satu saja karena LEFT JOIN
        ],
        as: 'menu_klp_data'
        }
    },
    {
        $unwind: {
        path: '$menu_klp_data',
        preserveNullAndEmptyArrays: true // ini yang bikin LEFT JOIN
        }
    },
    {
        $addFields: {
            menu_klp_id: '$menu_klp_data.menu_klp_id',
            menu_klp_list_id: '$menu_klp_data.id',
            readx: { $ifNull: ['$menu_klp_data.readx', false] },
            updatex: { $ifNull: ['$menu_klp_data.updatex', false] },
            deletex: { $ifNull: ['$menu_klp_data.deletex', false] },
            addx: { $ifNull: ['$menu_klp_data.addx', false] }
        }
    },
    {
        $match: {
           $or: [
            { readx: true },
            { updatex: true },
            { deletex: true },
            { addx: true } ]
           }
    },
    {
        $project: {
        menu_klp_data: 0 // sembunyikan join-an mentah
        }
    },
    {
        $sort: {
        urutan: 1 // urut berdasarkan menu.urutan
        }
    }
    ]).toArray();

    const nest = (items, id = null, link = 'parent') =>
    items
        .filter(item => item[link] === id)
        .map(item => {
        const children = nest(items, item.id, link);
        return {
            ...item,
            ...(children.length > 0 && { child: children }) // hanya tambahkan jika tidak kosong
        };
    });
    res.send(nest(result))
    

})

const responQuery = async (result, req, res, next, successMessage, errorMessage) => {
    try {
        let action = '';

        // INSERT
        if (result.insertedId || (result.acknowledged && result.upsertedCount === 1)) {
            action = 'add';
        }

        // UPDATE
        else if (typeof result.matchedCount !== 'undefined') {
            if (result.matchedCount === 0) {
                // Tidak ada data dengan id yang dimaksud
                return res.status(404).json({
                    action: 'edit',
                    message: 'Data dengan ID tersebut tidak ditemukan'
                });
            } else if (result.modifiedCount === 0) {
                // Data ditemukan tapi tidak berubah
                return res.status(200).json({
                    action: 'edit',
                    message: 'Tidak ada perubahan data yang dilakukan'
                });
            } else {
                action = 'edit';
            }
        }

        // DELETE
        else if (typeof result.deletedCount !== 'undefined') {
            if (result.deletedCount === 0) {
                return res.status(404).json({
                    action: 'remove',
                    message: 'Data yang ingin dihapus tidak ditemukan'
                });
            } else {
                action = 'remove';
            }
        }

        // Jika berhasil dan ada aksi yang dikenali
        if (action) {
            console.log(`[${action.toUpperCase()}]`, result);
            return res.status(200).json({
                action,
                message: successMessage || `${action} success`
            });
        }

        // Fallback error
        return res.status(500).json({
            message: errorMessage || 'Operasi tidak dikenali atau gagal'
        });

    } catch (err) {
         
        return res.status(500).json({
            message: 'Internal server error'
        });
    }

};


module.exports = router