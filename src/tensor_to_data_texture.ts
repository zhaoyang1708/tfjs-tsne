/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as tfc from '@tensorflow/tfjs-core';
import * as gl_util from './gl_util';
import {RearrangedData} from './interfaces';

//converts a 2D tensor in a texture that is optimized format the kNN computation
//Switch to a GPU implmentation
export async function tensorToDataTexture(tensor: tfc.Tensor):
          Promise<{shape: RearrangedData, texture: WebGLTexture}>
{
  const inputShape = tensor.shape;
  if (inputShape.length !== 2) {
    throw Error('tensorToDataTexture: input tensor must be 2-dimensional');
  }

  //Getting the context for initializing the texture
  const backend = tfc.ENV.findBackend('webgl') as tfc.webgl.MathBackendWebGL;
  if (backend === null) {
    throw Error('WebGL backend is not available');
  }
  const gpgpu = backend.getGPGPUContext();

  //Computing texture shape
  const numPoints = inputShape[0];
  const numDimensions = inputShape[1];
  const numChannels = 4;
  const pixelsPerPoint = Math.ceil(numDimensions/numChannels);
  const pointsPerRow = Math.floor(Math.sqrt(numPoints * pixelsPerPoint)
                                  / pixelsPerPoint);
  const numRows = Math.ceil(numPoints/pointsPerRow);

  const tensorData = tensor.dataSync();

  //Reading tensor values
  const textureValues =
      new Float32Array(pointsPerRow * pixelsPerPoint * numRows * numChannels);

  for(let p = 0; p < numPoints; ++p){
    const tensorOffset = p * numDimensions;
    const textureOffset = p * pixelsPerPoint * numChannels;
    for(let d = 0; d < numDimensions; ++d){
      textureValues[textureOffset + d] = tensorData[tensorOffset + d];
    }
  }

  //TODO clean
  console.log(tensorData);
  console.log(textureValues);

  const texture = gl_util.createAndConfigureTexture(
      gpgpu.gl, pointsPerRow * pixelsPerPoint, numRows, 4, textureValues);
  const shape = {numPoints, pointsPerRow, numRows, pixelsPerPoint};
  //TODO clean
  console.log(shape);

  return {shape,texture};
}