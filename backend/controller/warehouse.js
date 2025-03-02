const mongoose = require('mongoose');
const Warehouse = require("../modals/warehouse");
const Subunit = require("../modals/subunit");
const Book = require("../modals/book");
require("dotenv").config({path: "../config/config.env"});

// API for warehouse registration
const warehouseRegister = async (req,res) => {
    const { user_id,
        name,
        email,
        businessName,
        contactNumberMobile,
        businessAddress,
        city,
        state,
        zip,
        subUnits,
        features,
        coordinates,
        images } = req.body;

    if(!user_id){
        return res.status(401).json("User not logged in");
    }

    if (!name&&!email&&!businessName&&!contactNumberMobile&&!businessAddress&&!city&&!state&&!zip&&!subUnits) {
        return res.status(422).json("Please fill all the fields");
    }
    try {
        const warehouse = new Warehouse({
            user_id: mongoose.Types.ObjectId(user_id),
            name: name,
            email: email,
            businessName: businessName,
            contactNumberMobile: contactNumberMobile,
            businessAddress: businessAddress,
            city: city,
            state: state,
            zip: zip,
            features: features,
            images: images,
            lat: coordinates[1],
            lng: coordinates[0]
        });
        let warehouse_id = null;
        await warehouse.save()
        .then(res => warehouse_id = mongoose.Types.ObjectId(res._id))
        .catch(err => console.log(err))
        if(warehouse_id){
            subUnits.map(async (ele,ind) => {
                try{
                    ele.warehouse_id = warehouse_id;
                    const subunit = new Subunit(ele);
                    const resSubunitReg = await subunit.save();
                    if(resSubunitReg){
                        return res.status(200).json({message: 'WareHouse registered successfully'});
                    }else{
                        return res.status(401).json({message: "Subunits are not saved properly"});
                    }
                }catch(err){
                    console.log(err);
                }
            });
        }else{
            return res.status(401).json({message: "Subunits are not saved properly"});
        }
    } catch (err) {
        console.log(err);
        return res.status(402).json({message: "Something went wrong!!"});
    }
}

// API to fetch all warehouses
const getAllWarehouse = async (req,res) => {
    try{
        let data = await Warehouse.find({}).lean();
        for(let i=0;i<data.length;i++){
            const warehouse_id = data[i]._id;
            const res2 = await Subunit.find({warehouse_id}).clone().lean();
            data[i].subunits = res2;
        }
        return res.status(200).json({data: data});
    }catch(err){
        return res.status(402).json({message: "Something went wrong!!"});
    }
}

// get user warehouse
const getUserWareHouses = async (req,res) => {
    const userID = req.body.user_id;
    try{
        const data = await Warehouse.find({user_id: userID}).lean();
        for(let i=0;i<data.length;i++){
            const warehouse_id = data[i]._id;
            const res2 = await Subunit.find({warehouse_id}).clone().lean();
            let l = 0, w = 0;
            for(let j=0;j<res2.length;j++){
                l+=parseInt(res2[j].length);
                w+=parseInt(res2[j].width);
            }
            data[i].size = l + "x" + w;
        }
        return res.status(200).json({data: data});
    }catch(err){
        return res.status(402).json({message: "Something went wrong!!"});
    }
}

const getStrDate = (num) => {
    let date = new Date(num);
    let strday = date.getDate().toString();
    if (strday.length === 1) {
      strday = "0" + date.getDate().toString();
    }

    let strmonth = date.getMonth().toString();
    if (strmonth.length === 1) {
      strmonth = "0" + (date.getMonth() + 1).toString();
    }

    let strdate = date.getFullYear().toString() + "-" + strmonth + "-" + strday;

    return strdate;
  };

const getDisableDates = async (req, res) => {
    try{
        const data = await Book.find({subunit_id: req.body.subunit_id, status: "Booked"}).clone().lean();
        // console.log(data);
        let disableInterval = [];
        data?.map((ele, ind) => {
            let tempObj = {}
            tempObj.start = new Date(getStrDate(parseInt(ele.occupiedFrom) - 1));
            tempObj.end = new Date(getStrDate(parseInt(ele.occupiedTo)));
            disableInterval.push(tempObj);
        });
        return res.status(200).json(disableInterval);
    }catch(err) {
        return res.status(402).json({message: "Something went wrong!!"});
    }
    // return data;
}

// 
const getWarehouseWithSubunit = async (req,res) => {
    const warehouse_id = req.body.data;
    try{
        const warehouse = await Warehouse.findOne({_id: warehouse_id}).clone().lean();
        const subunits = await Subunit.find({warehouse_id: warehouse_id}).clone().lean();
        for(let i=0;i<subunits.length;i++){
            const s_id = subunits[i]._id;
            const book = await Book.findOne({subunit_id: s_id, status: "Booked"});
            if(book){
                const occFrom = book.occupiedFrom;
                const occTo = book.occupiedTo;
                subunits[i].status = "1";
                subunits[i].occFrom = occFrom;
                subunits[i].occTo = occTo;
            }else{
                subunits[i].status = "0";
            }
        }
        return res.status(200).json({warehouse, subunits});
    }catch(err){
        return res.status(402).json({message: "Something went wrong!!"});
    }
}

// verify warehouse via admin
const verifyWarehouse = async (req,res) => {
    const id = req.body.id;
    try{
        const data = await Warehouse.updateOne({_id: id}, {$set:{
            isVerified: true
        }}, function(err){
            console.log(err);
        });
        res.send(data);
    }catch(err){
        return res.status(402).json({message: "Something went wrong!!"});
    }
}

const getSubunit = async (req,res) => {
    const subunit_id = req.body.id;
    try{
        const subunit = await Subunit.findOne({_id: subunit_id}).clone().lean();
        const warehouse_id = subunit.warehouse_id;
        const warehouse = await Warehouse.findOne({_id: warehouse_id}).clone().lean();
        if(subunit && warehouse){
            return res.status(200).json({subunit, warehouse});
        }else{
            return res.status(402).json({message: "Something went wrong!!"});
        }
    }catch(err){
        return res.status(402).json({message: "Something went wrong!!"});
    }
} 

module.exports = {
    warehouseRegister,
    getAllWarehouse,
    getUserWareHouses,
    getWarehouseWithSubunit,
    verifyWarehouse,
    getSubunit,
    getDisableDates
};
  