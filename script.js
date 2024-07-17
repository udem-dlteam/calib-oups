// Copyright: Marc Feeeey, 2024
// Copyright: Léonard Oest O'Leary, 2024
// v1: April 10, 2024
// v2: July 4, 2024

// ==================
// == UI functions ==
// ==================

function ui_setup(){
  ui_state_set('disconnected');
  ui_setup_calibration_menu();
}


let standard_weights = [0, 10, 20, 50, 100, 200, 500, 1000]
function ui_setup_calibration_menu(){
  let container = document.querySelector('.ui_calibration_menu');
  if (container){
    for (let weight of standard_weights){
      let row = document.createElement('div');
      row.classList.add('ui_calibration_menu_row');

      // Checkbox
      let checkbox = document.createElement('input');
      checkbox.classList.add('ui_calibration_checkbox');
      checkbox.type = 'checkbox';
      //checkbox.innerText = "set";
      checkbox.onchange = function(){
        input_set_calibration_at_weight(weight, this.checked);
      }
      checkbox.disabled = true;
      row.appendChild(checkbox);

      // Weight label
      let weight_text = document.createElement('div');
      weight_text.innerText = weight + 'g';
      row.appendChild(weight_text);

      // Raw force
      let raw_text = document.createElement('div');
      raw_text.id = 'ui_weight_raw_' + weight;
      raw_text.innerText = NA_string;
      row.appendChild(raw_text);

      // Calibrated force
      let calibrated_text = document.createElement('div');
      calibrated_text.id = 'ui_weight_calibrated_' + weight;
      calibrated_text.innerText = NA_string;
      row.appendChild(calibrated_text);

      container.appendChild(row);
    }
  }
}


function ui_state_set(state){
  if(!["connected", "connecting", "disconnected"].includes(state)){
    throw new Error('Invalid state');
  }

  let main = document.querySelector('.ui');
  if (main){
    main.setAttribute('data-state', state);
  }

  // Calibrate button
  let button = document.querySelector('#ui_calibrate_button');
  if (button){
    button.disabled = state !== 'connected';
  }
  
  if (state === 'disconnected'){
    ui_set_enable_checkboxes(false);
  }

  //// units
  //let units = document.querySelectorAll('.ui_unit');
  //if (units){
  //  for (let unit of units){
  //    unit.disabled = state !== 'connected';
  //    if (state !== 'connected'){
  //      unit.innerText = 'N/A';
  //    }
  //  }
  //}
}


function ui_unset_calibrated_force(){
  let arrow_container = document.querySelector('#ui_arrow_container');
  arrow_container.setAttribute("hidden", true);

  let force_container = document.querySelector('#ui_calibrated_force_container');
  force_container.setAttribute("hidden", true);

}

function ui_set_calibrated_force(force){
  let arrow_container = document.querySelector('#ui_arrow_container');
  arrow_container.removeAttribute("hidden");

  let force_container = document.querySelector('#ui_calibrated_force_container');
  force_container.removeAttribute("hidden");

  let force_display = document.querySelector('#ui_calibrated_force');
  force_display.innerText = force.toFixed(0);
}


const set_ui = (id, fixed=0) => 
  (value) => 
    // check if the value is a string, else asume it is a number
    document.querySelector(id).innerText = (typeof value === "string") ? value : value.toFixed(fixed);

const ui_set_captor_force = set_ui('#ui_captor_force');
const ui_set_captor_force_raw = set_ui('#ui_captor_force_raw');
//const ui_set_calibrated_force = set_ui('#ui_calibrated_force');

const ui_set_weight_raw = (weigth, force) => 
  set_ui('#ui_weight_raw_' + weigth)(force);

const ui_set_weigth_calibrated = (weigth, force) =>
  set_ui('#ui_weight_calibrated_' + weigth)(force);


const NA_string = '';
const ui_update_calibration = () => {

  standard_weights.forEach(weight => {
    let is_calibrated = calibrations.has(weight);
    if (is_calibrated && calibration_slope !== null && calibration_bias !== null){
      let calibrated_force = calculate_calibration(calibration_slope, calibration_bias, calibrations.get(weight));
      ui_set_weigth_calibrated(weight, calibrated_force);
    }
    else{
      ui_set_weigth_calibrated(weight, NA_string);
    }
  });
}

const ui_set_enable_checkboxes = (enable) => {
  let checkboxes = document.querySelectorAll('.ui_calibration_checkbox');
  checkboxes.forEach(c => c.disabled = !enable);
}

const ui_reset_checkboxes = () => {
  let checkboxes = document.querySelectorAll('.ui_calibration_checkbox');
  checkboxes.forEach(c => c.checked = false);
}

function ui_reset_calibration(){
  calibrations.keys().forEach(weight => input_set_calibration_at_weight(weight, false));
  ui_reset_checkboxes();
  reset_calibration();
  ui_update_calibration();
}

// =======================
// == UI event handlers ==
// =======================


async function input_calibrate_button_click(){
  if (calibration_slope === null || calibration_bias === null){
    alert('Please calibrate the device first');
    return;
  }

  try{
    await force_slope_characteristic.writeValueWithResponse(new Int32Array([calibration_slope]));
    await force_offset_characteristic.writeValueWithResponse(new Int32Array([calibration_bias]));
  } catch (e){
    console.error(e);
    alert("Error while writing the calibration values");
    return;
  }

  ui_reset_calibration();
  alert("Calibration values written to the device");
}

async function input_connection_button_click() {
  if (bluetooth_device === null) {
    await connect_device();
  } else {
    await disconnect_device();
  }
}


async function input_set_calibration_at_weight(weight, checked){
  if (checked){
    ui_set_weight_raw(weight, latest_raw_force);
    set_calibration(weight, latest_raw_force);
  }
  else{
    ui_set_weight_raw(weight, NA_string);
    unset_calibration(weight);
  }
  update_calibration();
  ui_update_calibration();
}

// ================================
// == Force calibration routines ==
// ================================

const sum = (lst) => lst.reduce((a, b) => a + b, 0);
const zip = (a, b) => a.map((k, i) => [k, b[i]]);

let calibrations = new Map();
let calibration_slope = null;
let calibration_bias = null;
let scaling = 65536

function calculate_calibration(slope, bias, value){
  let result = (slope * value + bias + scaling/2) / scaling;
  return Math.floor(result);
}


function update_calibration(){
  let n = calibrations.size;
  if (n >= 2){
    let x_vals = calibrations.values().toArray();
    let y_vals = calibrations.keys().toArray();

    let x_mean = sum(x_vals) / n
    let y_mean = sum(y_vals) / n

    let x_diff = x_vals.map(x => x - x_mean)
    let y_diff = y_vals.map(y => y - y_mean)

    let num = zip(x_diff, y_diff).reduce((acc, [a, b]) => acc + a * b, 0)
    let den = x_diff.reduce((acc, a) => acc + a**2, 0)

    let slope = num / den
    let bias = y_mean - x_mean * slope

    let int_slope = Math.floor(slope * scaling)
    let int_bias = Math.floor(bias * scaling)
    
    calibration_slope = int_slope
    calibration_bias = int_bias
  
  }
  else{
    calibration_slope = null
    calibration_bias = null
  }
}

function unset_calibration(weight){
  calibrations.delete(weight);
}

function set_calibration(weight, force){
  calibrations.set(weight, force);
}

function set_captor_force(calibrated_force, raw_force){
  ui_set_captor_force(calibrated_force);
  ui_set_captor_force_raw(raw_force);

  if(calibration_slope !== null && calibration_bias !== null){
    let calibrated_force = calculate_calibration(calibration_slope, calibration_bias, raw_force);
    ui_set_calibrated_force(calibrated_force);
  }
  else{
    ui_unset_calibrated_force();
  }

  // Update global variables
  latest_calibrated_force = calibrated_force;
  latest_raw_force = raw_force;
}

function reset_calibration(){
  calibrations = new Map();
  calibration_slope = null;
  calibration_bias = null;
}


// ========================================
// ==== Listeners for device events =======
// ========================================

let VALUES_TO_MEAN = 40;
let FORCE_DELTA_THRESHOLD = 1000;
let last_values = [];

async function handle_force_value_changed(event) {

  const view = event.target.value;

  //debug
  if (trace_packets) { 
    let str = 'force packet:';
    for (let i=0; i<14; i++) {
      str = str + ' ' + view.getUint8(i);
    }
    log(str);
  }

  let timestamp = view.getBigUint64(1, true);
  let calibrated_force = view.getInt32(10, true);
  let raw_force = view.getInt32(14, true);

  //debug
  //let trace_readings = true;
  if (trace_readings) {
    log(timestamp + ' ' + calibrated_force + ' ' + raw_force);
  }

  last_values.push([calibrated_force, raw_force]);

  while (last_values.length > VALUES_TO_MEAN) last_values.shift();
  if (last_values.length == VALUES_TO_MEAN){
    // Smooth the values
    let [smoothed_calibrated_force, smoothed_raw_force] = last_values
      .reduce((acc, [a, b]) => [acc[0] + a, acc[1] + b], [0, 0])
      .map(x => x / VALUES_TO_MEAN);
    set_captor_force(smoothed_calibrated_force, smoothed_raw_force);

    // Enable checkboxes if the force is stable
    let max_raw_force = last_values.reduce((acc, [a, b]) => Math.max(acc, b), last_values[0][1]);
    let min_raw_force = last_values.reduce((acc, [a, b]) => Math.min(acc, b), last_values[0][1]);
    let delta = max_raw_force - min_raw_force;
    ui_set_enable_checkboxes(delta < FORCE_DELTA_THRESHOLD);
  }
}


function handle_device_connection() {
  log('handle_device_connection');
  device_latest_readings = [];
  is_connected = true;
}

function handle_device_disconnection() {
  log('handle_device_disconnection');
  is_connected = false;
}


// ====================================
// == Connection to the Oups! device ==
// ====================================

let is_connected = false;
let device_latest_readings = [];
let readings_to_average = 4;

const timestampIndex = 0;
const forceIndex = 1;
const xIndex = 2;
const yIndex = 3;
const zIndex = 4;

function get_current_device_reading() {
  let reading = [0, 0, 0, 0, 0];
  for (let i=0; i<device_latest_readings.length; i++) {
    reading[0] = device_latest_readings[i][0];
    for (let j=1; j<reading.length; j++) {
      reading[j] += device_latest_readings[i][j];
    }
  }
  for (let j=1; j<reading.length; j++) {
    reading[j] = reading[j] / device_latest_readings.length;
  }
  return reading;
}  
    
let trace_packets = false; // For debugging packets
let trace_readings = false; // For debuggin readings

function log(msg) {
  console.log(msg);
}

let device_name_prefix = 'Oups!';

// Hardware connection ids
let OUPS_service_id         = '0000ffe0-0000-1000-8000-00805f9b34fb';
let force_characteristic_id = '0000ffe2-0000-1000-8000-00805f9b34fb';
let IMU_characteristic_id   = '0000ffe3-0000-1000-8000-00805f9b34fb';

let bluetooth_device     = null;
let force_characteristic = null;
let IMU_characteristic   = null;

let latest_calibrated_force = null;
let latest_raw_force = null;

async function request_device() {

  log('*** Requesting device');

  bluetooth_device = await navigator.bluetooth.requestDevice({
    filters: [{namePrefix: device_name_prefix}],
    optionalServices: [OUPS_service_id]});

  bluetooth_device.addEventListener('gattserverdisconnected', on_disconnected);
}

async function on_disconnected() {

  log('*** Device disconnected');

  ui_state_set('disconnected');
  handle_device_disconnection();

  force_characteristic.removeEventListener('characteristicvaluechanged',
    handle_force_value_changed);
  force_characteristic = null;

  // IMU_characteristic.removeEventListener('characteristicvaluechanged',
  //   handle_IMU_value_changed);
  // IMU_characteristic = null;

  bluetooth_device = null;
}

async function disconnect_device() {

  log('*** Disconnecting device');

  if (bluetooth_device === null || !bluetooth_device.gatt.connected) return;

  await bluetooth_device.gatt.disconnect();
}

async function connect_device() {

  if (!bluetooth_device) {
    await request_device();
  }

  if (bluetooth_device.gatt.connected) return;

  //print
  log('*** Connecting to device');

  ui_state_set('connecting');

  const server = await bluetooth_device.gatt.connect();

  const service = await server.getPrimaryService(OUPS_service_id);

  force_characteristic = await service.getCharacteristic(force_characteristic_id);
  force_characteristic.addEventListener('characteristicvaluechanged',
    handle_force_value_changed);

  //IMU_characteristic = await service.getCharacteristic(IMU_characteristic_id);
  //IMU_characteristic.addEventListener('characteristicvaluechanged',
  //  handle_IMU_value_changed);

  ui_state_set('connected');
  handle_device_connection();

  await start_notifications();
}

async function start_notifications() {

  log('*** Starting notifications');

  try {
    await force_characteristic.startNotifications();
    //await IMU_characteristic.startNotifications();
  } catch (exc) {
    log('Error: ' + exc);
  }
}

// Not used but may be usefull

//async function ui_toggle_calibrate(weight){
//  let force = latest_force;
//  ui_set_weight_raw(weight, force);
//  set_calibration(weight, force);
//}

// function handle_device_notification(timestamp, force, ax, ay, az) {
// //  log('handle_device_notification ' + timestamp + ' ' + force + ' ' + ax + ' ' + ay + ' ' + az);
//   let reading = [timestamp, force, ax, ay, az];
//   device_latest_readings.push(reading);
//   while (device_latest_readings.length > readings_to_average) device_latest_readings.shift();
// }


// async function handle_IMU_value_changed(event) {
// 
//   const view = event.target.value;
// 
//   if (trace_packets) {
//     let str = 'IMU packet:';
//     for (let i=0; i<38; i++) {
//       str = str + ' ' + view.getUint8(i);
//     }
//     log(str);
//   }
//   
//   let timestamp = view.getUint32(1, true);
// //  let temp = view.getFloat32(10, true);
//   let ax = view.getFloat32(14, true);
//   let ay = view.getFloat32(18, true);
//   let az = view.getFloat32(22, true);
// 
//   if (trace_readings) {
//     log(timestamp + ' ' + ax + ' ' + ay + ' ' + az);
//   }
// 
//   //if (latest_force !== null) {
//   //  handle_device_notification(timestamp, latest_force, ax, ay, az);
//   //}
// }

// function ui_state_set(state) {
//     let but = document.querySelector('.ui_connection_button');
//     let msg = document.querySelector('.ui_message');
//     if (but && msg) {
//       but.setAttribute('data-state', state);
//       msg.setAttribute('data-state', state);
//       if (state === 'connecting') {
//         msg.innerText = 'Un moment SVP...';
//         but.innerText = 'Un moment SVP...';
//         but.disabled = true;
//         but.style.display = 'none';
//       } else {
//         msg.innerText = (state === 'connected') ? 'Connecté' : 'Déconnecté !!';
//         but.innerText = (state === 'connected') ? '>>> Déconnecter <<<' : '>>> Connecter <<<';
//         but.disabled = false;
//         but.style.display = 'inline';
//       }
//     }
//   }
