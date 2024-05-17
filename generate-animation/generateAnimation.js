/*

for file in ./output/*.svg; do rsvg-convert -f png -o "./pngs/$(basename "$file" .svg).png" "$file"; done

ffmpeg -framerate 24 -pattern_type glob -i './pngs/*.png' -c:v libx264 -pix_fmt yuv420p ./output.mp4 

*/


import { $ } from "bun";

import fs from 'fs';
import path from 'path';

import { toolkit as bt } from "../src/drawingToolkit/toolkit.js";


const NUMBER_OF_GROUPS = 200;
const TOTAL_TIME = 2.5;


const width = 3840;
const height = 2160;

// setDocDimensions(width, height);

bt.setRandSeed(3)


let subpaths = pathData.split("M").map(pl => pl.split("L").map(pair => pair.trim().split(" ").map(Number)));
const newSubpaths = [];
subpaths.forEach(pl => {
  const newPl = [];
  pl.forEach(pt => {
    newPl.push(pt)
  })

  if (newPl.length > 1) newSubpaths.push(newPl);
})

subpaths = newSubpaths;

bt.resample(subpaths, .05);

const groupIndices = splitIntoEvenArrays(subpaths.length, NUMBER_OF_GROUPS);
const groups = groupIndices.map(group => group.map(index => subpaths[index]));


// const frames = [];

// const numberFrames = 24 * 3;

// for (let i = 0; i < numberFrames; i += 1) {
//   const currentFrame = [];
//   groups.forEach(pls => {

//     // pls.forEach(pl => {
//     //   const copiedPl = [ bt.copy(pl) ];
//     //   bt.trim(copiedPl, 0, i/numberFrames);
//     //   currentFrame.push(copiedPl[0]);
//     // })

//     const copiedPl = bt.copy(pls);
//     bt.trim(copiedPl, 0, i / (numberFrames + 1));
//     bt.join(currentFrame, copiedPl);

//   });

//   frames.push(currentFrame);
// }

// console.log(frames);

// bt.join(finalLines, frames.at(26))

// center piece
const bb = () => bt.bounds(subpaths);

const aspectRatioWindow = width / height;
const aspectRatioArt = bb().width / bb().height;

const scaleFactor = aspectRatioWindow < aspectRatioArt ?
  width / bb().width * 1 :
  height / bb().height * 1;

const cc = bb().cc;

bt.scale(subpaths, scaleFactor, cc);
bt.translate(subpaths, [width / 2, height / 2], cc);

function makeFrame(t) {
  const finalLines = [];

  const currentFrame = [];
  groups.forEach(pls => {

    const copiedPls = bt.copy(pls);
    bt.trim(copiedPls, 0, t);
    const finalPls = [];
    copiedPls.forEach(pl => {
      const l = calculatePolylineLength(pl);
      if (l < 3) return;
      else finalPls.push(pl);
    })
    bt.join(currentFrame, finalPls);

  });

  bt.join(finalLines, currentFrame);

  return finalLines;
}

function clearDirectorySync(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      fs.unlinkSync(path.join(dir, file));
    }
    console.log(`Cleared out ${dir} synchronously.`);
  } catch (err) {
    console.error(`Error clearing out directory ${dir} synchronously: ${err}`);
  }
}

function clearDirectoriesSync() {
  const directories = ['svgs', 'pngs', 'output'];
  directories.forEach(clearDirectorySync);
}

clearDirectoriesSync();

let total = Math.ceil(24*TOTAL_TIME);
for (let i = 0; i < total; i += 1) {
  const t = i;
  const frame = makeFrame(i/(total-1));
  const svgString = plsToSVG(frame, width, height);
  const timestamp = new Date().getTime();

  // const canvas = createCanvas();


  fs.writeFileSync(`./svgs/lines_${timestamp}.svg`, svgString);
}

// await $`for file in ./svgs/*.svg; do rsvg-convert -f png -o "./pngs/$(basename "$file" .svg).png" "$file"; done`

const svgDirectory = './svgs';
const pngDirectory = './pngs';

const svgFiles = fs.readdirSync(svgDirectory).filter(file => file.endsWith('.svg'));

for (const svgFile of svgFiles) {
  const svgFilePath = path.join(svgDirectory, svgFile);
  const pngFilePath = path.join(pngDirectory, `${path.basename(svgFile, '.svg')}.png`);
  
  // Convert SVG to PNG using rsvg-convert
  await $`rsvg-convert -f png -o "${pngFilePath}" "${svgFilePath}"`;
  console.log(`Converted ${svgFilePath} to ${pngFilePath}`);
};

await $`ffmpeg -framerate 24 -pattern_type glob -i './pngs/*.png' -c:v libx264 -pix_fmt yuv420p ./output/output-movie.mp4`


// draw it
// drawLines(finalLines);

function plsToSVG(polylines, width, height) {
  // Create the SVG header
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" transform="scale(1 -1) translate(0 -${height})">`;
  svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="white" />`
  
  // Loop through each polyline
  for (let polyline of polylines) {
    // Build the polyline path string
    let path = '';
    for (let [x, y] of polyline) {
      path += `${x},${y} `;
    }

    // Add the polyline element to the SVG
    svg += `<polyline stroke-width="3" fill="none" stroke="black" points="${path.trim()}"/>`;
  }

  // Close the SVG
  svg += '</svg>';

  return svg;
}

function calculatePolylineLength(polyline) {
  let totalLength = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const [x1, y1] = polyline[i];
    const [x2, y2] = polyline[i + 1];

    const dx = x2 - x1;
    const dy = y2 - y1;

    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    totalLength += segmentLength;
  }

  return totalLength;
}

function splitIntoEvenArrays(n, numArrays) {
  const arrays = Array.from({ length: numArrays }, () => []);
  const numbers = Array.from({ length: n }, (_, index) => index).sort(() => bt.rand() - 0.5);
  numbers.forEach((number, index) => {
    arrays[index % numArrays].push(number);
  });
  return arrays;
}