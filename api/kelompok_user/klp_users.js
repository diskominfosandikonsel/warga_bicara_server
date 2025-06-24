const express = require('express')
const router = express.Router()
const {getCollection} = require('../../db/mongodb/controller') 
const uniqid = require('uniqid')



router.post('/viewData', async (req, res, next) => { 
    const listMenu = await getCollection('menu'); //memilih collection yang mau di query
    const result = await listMenu.find().toArray(); //query cari data
    if (result.length <= 0) {
        res.status(404).json({ message: "Data tidak ditemukan" })
    } else {
            const nest = (items, id = null, link = 'parrent') =>
            items
                .filter(item => item[link] === id)
                .map(item => ({ ...item, subItem: nest(items, item.id) })); 
                
            res.send(nest(result))
    }
})

router.post('/addData', async (req, res, next) => {
    const id_klp = uniqid();

    const datax = req.body.data; 
    const list_menux = req.body.list_menu; 
    const data = flattenMenu(list_menux); // Dijadikan satu level

    // res.send(data);

    const dataxy = {
        id                  :   '',
        menu_id             :   '',
        menu_klp_id         :   '',
        readx               :   '',
        updatex             :   '',
        deletex             :   '',
        addx                :   '',
    }

    const menu_klp = await getCollection('menu_klp')
    const result = await menu_klp.insertOne({id:id_klp, uraian:datax.uraian})
    console.log(result.acknowledged);
    
    if (result.acknowledged === true) { 
        console.log("Data kelompok berhasil ditambahkan");
        data.forEach(async element => {
                dataxy.id          = uniqid();
                dataxy.menu_id     = datax.id;
                dataxy.menu_klp_id = id_klp;
                dataxy.readx       = element.readx;
                dataxy.updatex     = element.updatex;
                dataxy.deletex     = element.deletex;
                dataxy.addx        = element.addx;
            
            console.log("============================ ELEMENT ============================");
            console.log(dataxy);
    
            const menu_klp_list = await getCollection('menu_klp_list')
            const result_menu_klp_list = await menu_klp_list.insertOne(dataxy)

            if (result_menu_klp_list.acknowledged === true) {
                console.log("Data kelompok list berhasil ditambahkan" + dataxy.menu_id); 
            }else{
                console.log("Data menu klp list gagal ditambahkan"); 
            }
            
        })

        res.send({ message: "Data menu klp list berhasil ditambahkan" });

    }else{
        console.log("Data kelompok gagal ditambahkan"); 
        return res.status(500).json({ message: "Data kelompok gagal ditambahkan" });
    }



    

    // responQuery(result, req, res, next, "Data berhasil ditambahkan", "Data gagal ditambahkan");

    
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



router.post('/editData', async (req, res, next) => {
    const data = req.body; 
    const listMenu = await getCollection('menu');
    const result = await listMenu.updateOne({ id :data.id }, 
        { $set: {
                    title     :data.title,
                    icon      :data.icon,
                    color     :data.color,
                    route     :data.route,
                    type      :data.type,
                    jenis     :data.jenis,
                    parrent   :data.parrent,
                    urutan    :data.urutan
                }
        })

    responQuery(result, req, res, next, "Data berhasil diupdate", "Data gagal diupdate");
})

router.post('/removeData', async (req, res, next) => {
    const data = req.body;
    const listMenu = await getCollection('menu');
    const result = await listMenu.deleteOne({ id: data.id });
    responQuery(result, req, res, next, "Data berhasil dihapus", "Data gagal dihapus");
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
        console.error('responQuery error:', err);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }

};


module.exports = router