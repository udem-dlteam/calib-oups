// Recording app for the Oups! device
// Copyright: Marc Feeley, 2024
// Copyright: Léonard Oest O'Leary, 2024
// v1: April 10, 2024
// v2: July 4, 2024

// ==================
// == UI functions ==
// ==================

let canvas;
function ui_setup(){
  ui_state_set('disconnected');
  canvas = document.querySelector('#ui_canvas');
  ui_setup_displays();
}

let displays = ['force', 'accel', 'gyro'];
let axis_display = ['X', 'Y', 'Z'];
function ui_setup_displays(){
  for(display of displays){
    let element = document.querySelector(`#ui_${display}_display`);
    element.classList.add('ui_display');

    let count = parseInt(element.getAttribute('data-count'));
    
    let label_container = document.createElement('div');
    label_container.classList.add('ui_display_container');

    //let label= document.createElement('div');
    //label.classList.add('ui_display_label');
    //label.innerText = display.toUpperCase();
    //label_container.appendChild(label);

    for (let i = 0; i < count; i++){
      let valueContainer = document.createElement('div');
      
      // Text node
      if (count == 3){
        let textNode = document.createTextNode(axis_display[i] + ': ');
        valueContainer.appendChild(textNode);
      }

      // Value node
      let value = document.createElement('span');
      value.classList.add('ui_display_value');
      value.id = `ui_display_${display}_${i}`;
      value.innerText = '0';
      if (count == 3){
        valueContainer.style.color = colors[i];
      }
      else{
        valueContainer.style.color = colors[3];
      }
      valueContainer.appendChild(value);

      // Add to container
      label_container.appendChild(valueContainer);
    }

    element.appendChild(label_container);

    let canvas = document.createElement('canvas');
    canvas.classList.add('ui_display_canvas');
    canvas.id = `ui_${display}_canvas`;
    canvas.setAttribute('state-max_h', element.getAttribute('data-max_h'));
    canvas.setAttribute('state-min_h', element.getAttribute('data-min_h'));

    element.appendChild(canvas);
  }
}

function set_display_values(display, values, unit, fixed=0){
  for (let [i, value] of values.entries()){
    let element = document.querySelector(`#ui_display_${display}_${i}`);
    element.innerText = value.toFixed(fixed) + unit;
  }
}


function ui_state_set(state){
  if(!["connected", "connecting", "disconnected"].includes(state)){
    throw new Error('Invalid state');
  }
  let main = document.querySelector('.ui');
  main.setAttribute('data-state', state);

  // Calibrate button
  let button = document.querySelector('#ui_calibrate_button');
  if (button){
    button.disabled = state !== 'connected';
  }

  let btn = document.querySelector('#ui_record_button');
  btn.disabled = state !== 'connected';
  if (state === 'connected'){
    set_recording_state(false);
  }
}

const set_ui = (id, fixed=0) => 
  (value) => 
    // check if the value is a string, else asume it is a number
    document.querySelector(id).innerText = (typeof value === "string") ? value : value.toFixed(fixed);

const ui_set_hz = set_ui('#ui_connection_hz', 0);

const ui_set_battery = set_ui('#ui_battery', 0);
const ui_set_force = set_ui('#ui_display_force', 0);

const NA_string = '';

let index = 0;
const colors = ['#EA2626', '#42B549', '#3094C3', '#DC2FF4'];
const recording_cursor_color = 'red';
const idle_cursor_color = 'black';
let cursor_color = idle_cursor_color;

const recording_cursor_width = 2;
const idle_cursor_width = 1;
let cursor_width = idle_cursor_width;

const recording_background_color = '#eba4a4';
const idle_background_color = 'white';
let background_color = idle_background_color;


function set_data_to_canvas(canvas, datas, last_datas) {

  if(!canvas) return;
  if (last_datas === null) {
    last_datas = datas;
  }

  let h = canvas.height;
  let w = canvas.width;
  let max_h = canvas.getAttribute('state-max_h');
  let min_h = canvas.getAttribute('state-min_h');
  let is_single_param = datas.length == 1;

  ctx = canvas.getContext('2d')
  ctx.fillStyle = background_color;
  ctx.fillRect(index, 0, 1, h);

  ctx.fillStyle = cursor_color;
  ctx.fillRect((index+1)%w, 0, cursor_width, h);

  let cap_datas = [];
  for(data of datas){
    if (data > max_h) {
      canvas.setAttribute('state-max_h', data + 10);
      max_h = data;
    }
    
    if (data < min_h) {
      canvas.setAttribute('state-min_h', data - 10);
      min_h = data;
    }
    let data_point = (data - min_h) * h / (max_h - min_h);
    cap_datas.push(data_point);
  }

  let color_index = 0;
  for ([data, last_data] of zip(cap_datas, last_datas)){
    if (is_single_param) {
      ctx.fillStyle = colors[3];
    } else {
      ctx.fillStyle = colors[color_index];
    }
    let min_data = Math.max(data, last_data);
    let diff_data = Math.abs(data - last_data);
    ctx.fillRect(index,Math.floor(h - min_data)-3, 1, 6 + Math.floor(diff_data));
    color_index += 1;
  }

  return cap_datas;
}

function increment(canvas_list) { 
  index++;

  let min_width = canvas_list[0].width;
  for (let canvas of canvas_list){
    min_width = Math.min(min_width, canvas.width);
  }
  index %= min_width;
}


// =======================
// == UI event handlers ==
// =======================


async function input_connection_button_click() {
  if (bluetooth_device === null) {
    await connect_device();
  } else {
    await disconnect_device();
  }
}

// ========================================
// ==== Listeners for device events =======
// ========================================

let last_values = [];

let LAST_VIEW = null;
const element_add = (a, b) => a.map((k, i) => k + b[i]);
const zip = (a, b) => a.map((k, i) => [k, b[i]]);

let last_force_data = null;
let last_accel_data = null;
let last_gyro_data = null;

let UPDATE_INTERVAL = 30;
let data_interval = [];
let update_counter = 0;
let last_timestamp = 0;

let recorded_data = [];
async function handle_sensor_value_changed(event) {

  const view = event.target.value;

  LAST_VIEW = view;

  //debug
  if (trace_packets) { 
    let str = 'force packet:';
    for (let i=0; i<14; i++) {
      str = str + ' ' + view.getUint8(i);
    }
    log(str);
  }

  
  // const size_t SENSOR_DATA_SIZE = 20;
  // enum SensorOffset {
  //     PACKET_OFFSET_TIMESTAMP = 0, // 4 bytes
  //     PACKET_OFFSET_FORCE = 4,     // 2 bytes
  //     PACKET_OFFSET_ACCEL_X = 6,   // 2 bytes
  //     PACKET_OFFSET_ACCEL_Y = 8,   // 2 bytes
  //     PACKET_OFFSET_ACCEL_Z = 10,  // 2 bytes
  //     PACKET_OFFSET_GYRO_X = 12,   // 2 bytes
  //     PACKET_OFFSET_GYRO_Y = 14,   // 2 bytes
  //     PACKET_OFFSET_GYRO_Z = 16,   // 2 bytes
  //     PACKET_OFFSET_BATTERY = 18,  // 2 byte
  // };
  let timestamp = view.getUint32(0, true);
  let force = view.getInt16(4, true);
  let accel_precision = 8192;
  let ax = view.getInt16(6, true);
  let cal_ax = ax / accel_precision;
  let ay = view.getInt16(8, true);
  let cal_ay = ay / accel_precision;
  let az = view.getInt16(10, true);
  let cal_az = az / accel_precision;

  let gyro_precision = 64;
  let gx = view.getInt16(12, true);
  let cal_gx = gx / gyro_precision;
  let gy = view.getInt16(14, true);
  let cal_gy = gy / gyro_precision;
  let gz = view.getInt16(16, true);
  let cal_gz = gz / gyro_precision;
  let battery = view.getUint8(18, true);

  const force_canvas = document.querySelector('#ui_force_canvas');
  const accel_canvas = document.querySelector('#ui_accel_canvas');
  const gyro_canvas = document.querySelector('#ui_gyro_canvas');

  last_force_data = set_data_to_canvas(force_canvas, [force], last_force_data);
  last_accel_data = set_data_to_canvas(accel_canvas, [ax, ay, az], last_accel_data);
  last_gyro_data = set_data_to_canvas(gyro_canvas, [gx, gy, gz], last_gyro_data);
  increment([force_canvas, accel_canvas, gyro_canvas]);

  data_interval.push([force, cal_ax, cal_ay, cal_az, cal_gx, cal_gy, cal_gz, timestamp-last_timestamp]);
  if (g_recording){
    recorded_data.push([timestamp, force, cal_ax, cal_ay, cal_az, cal_gx, cal_gy, cal_gz]);
    document.querySelector('#ui_recording_count').innerText = recorded_data.length;
  }

  last_timestamp = timestamp;
  update_counter++;
  if (update_counter < UPDATE_INTERVAL){
    return;
  }

  data_mean = data_interval
    .reduce(element_add)
    .map((k) => k / update_counter);


  let [force_mean, mean_ax, mean_ay, mean_az, mean_gx, mean_gy, mean_gz, delta_time] = data_mean;

  // hz
  ui_set_hz(1000 * (1 / delta_time));

  // force
  let force_mean_N = force_mean * 9.832 / 1000;
  set_display_values('force', [force_mean_N], ' Newton', 2);

  // accel and gyro
  accel_mean = [mean_ax, mean_ay, mean_az]
  gyro_mean = [mean_gx, mean_gy, mean_gz]
  set_display_values('accel', accel_mean, ' g', 3);
  set_display_values('gyro', gyro_mean, ' °/s', 2);

  // battery
  ui_set_battery(battery);

  // reset data & counter
  data_interval = [];
  update_counter = 0;
}


function handle_device_connection() {
  log('handle_device_connection');
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
    
let trace_packets = false; // For debugging packets
let trace_readings = false; // For debuggin readings

function log(msg) {
  console.log(msg);
}

let device_name_prefix = 'Oups!';

// Hardware connection ids
let OUPS_service_id         = '0000ffe0-0000-1000-8000-00805f9b34fb';

// let force_characteristic_id = '0000ffe2-0000-1000-8000-00805f9b34fb';
// let IMU_characteristic_id   = '0000ffe3-0000-1000-8000-00805f9b34fb';
let sensor_characteristic_id = '0000ffea-0000-1000-8000-00805f9b34fb';

const refresh_rate_id = '0000ffe8-0000-1000-8000-00805f9b34fb';

let bluetooth_device     = null;
let sensor_characteristic = null;
let refresh_rate_characteristic = null;

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

  sensor_characteristic.removeEventListener('characteristicvaluechanged',
    handle_sensor_value_changed);
  sensor_characteristic = null;

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

  sensor_characteristic = await service.getCharacteristic(sensor_characteristic_id);

  refresh_rate_characteristic = await service.getCharacteristic(refresh_rate_id);
  
  sensor_characteristic.addEventListener('characteristicvaluechanged',
    handle_sensor_value_changed);

  ui_state_set('connected');
  handle_device_connection();

  await start_notifications();
}

async function start_notifications() {

  log('*** Starting notifications');

  try {
    await sensor_characteristic.startNotifications();
  } catch (exc) {
    log('Error: ' + exc);
  }
}

let g_recording = false;
function set_recording_state(recording){
  g_recording = recording;
  let btn = document.querySelector('#ui_record_button');
  if (recording){
    cursor_color = recording_cursor_color;
    cursor_width = recording_cursor_width;
    background_color = recording_background_color;
    btn.innerText = 'Stop recording';

  } else {
    cursor_color = idle_cursor_color;
    cursor_width = idle_cursor_width;
    background_color = idle_background_color;
    btn.innerText = 'Start recording';
  }
}

async function input_save_button_click(){
  console.log('saving');
  let str = "";
  for (let data of recorded_data){
    str += data.join(',') + '\n';
  }
  let blob = new Blob([str], {type: 'text/plain'});
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');  
  a.href = url;
  a.download = 'recording.csv';
  a.click();
}

async function input_reset_button_click(){
  recorded_data = [];
  document.querySelector('#ui_recording_count').innerText = recorded_data.length;
}

async function input_record_button_click(){
  set_recording_state(!g_recording);
}
