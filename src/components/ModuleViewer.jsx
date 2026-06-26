import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { Bounds, Center, OrbitControls } from '@react-three/drei';
import axios from 'axios';
import { Button } from 'flowbite-react';
import * as THREE from 'three';
import { TbAugmentedReality2 } from "react-icons/tb";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import dracoDecoder from 'three/examples/jsm/libs/draco/draco_decoder.js?raw';
import { API_URL } from "../env";

function getModelErrorMessage(error) {
  if (error?.response?.status === 404) {
    return 'The configured 3D model file is missing from storage.';
  }

  if (error?.response?.status === 403) {
    return 'The 3D model file could not be accessed.';
  }

  return error?.message || 'The model file may not be available in this environment.';
}

function resolveSignedUrl(fileUrl) {
  if (!fileUrl) return '';

  if (typeof window === 'undefined') {
    return fileUrl;
  }

  try {
    const apiOrigin = new URL(API_URL || window.location.origin, window.location.origin).origin;
    return new URL(fileUrl, apiOrigin).toString();
  } catch (error) {
    return fileUrl;
  }
}

function Model3D({ url }) {
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderConfig({ type: 'js' });
    dracoLoader._loadLibrary = (libraryUrl) => {
      if (libraryUrl === 'draco_decoder.js') {
        return Promise.resolve(dracoDecoder);
      }

      return Promise.reject(new Error(`Unsupported Draco decoder asset: ${libraryUrl}`));
    };
    dracoLoader.preload();
    loader.setDRACOLoader(dracoLoader);
  });
  return <primitive object={gltf.scene} />;
}

function ModuleViewer({ url }) {
  const ref = useRef();
  const [signedUrl, setSignedUrl] = useState('');
  const [error, setError] = useState(null);

  const apiUrl = API_URL;

  const getSignedUrl = async () => {
    if (!url) {
      setError(new Error('No model file configured for this module.'));
      setSignedUrl('');
      return;
    }

    try {
      setError(null);
      setSignedUrl('');
      const response = await axios.get(`${apiUrl}/generate-signed-url/`, {
        params: { blob_name: url },
      });
      const resolvedUrl = resolveSignedUrl(response.data.url);
      setSignedUrl(resolvedUrl);
      console.log("Signed URL for 3D Model: " + resolvedUrl);
    } catch (error) {
      console.error("Error generating signed URL", error);
      setError(new Error(getModelErrorMessage(error)));
    }
  };

  useEffect(() => {
    getSignedUrl();
  }, [url]);

  const Background = () => {
    const { scene } = useThree();

    useEffect(() => {
      const color1 = new THREE.Color(0x0f0f0f); // dark color
      const color2 = new THREE.Color(0x3c3c3c); // lighter color

      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 32;

      const context = canvas.getContext('2d');

      const gradient = context.createLinearGradient(0, 0, 0, 32);
      gradient.addColorStop(0, color1.getStyle());
      gradient.addColorStop(1, color2.getStyle());

      context.fillStyle = gradient;
      context.fillRect(0, 0, 2, 32);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      scene.background = texture;
    }, [scene]);

    return null;
  };

  if (error) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
        <div className="text-center text-gray-500 dark:text-gray-300">
          <p className="text-lg font-medium">3D model could not be loaded</p>
          <p className="text-sm mt-2">{error.message || 'The model file may not be available in this environment.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <Button className="absolute top-4 right-4">
        View in AR/VR
        <TbAugmentedReality2 className="ml-2" />
      </Button>

      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.5, 6], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1.4} castShadow />
        <directionalLight position={[-4, 3, -3]} intensity={0.6} />
        <Suspense
          fallback={
            <mesh position-y={0.5} scale={[2, 3, 2]}>
              <boxGeometry args={[1, 1, 1, 2, 2, 2]} />
            </mesh>
          }>
          <Bounds fit clip observe margin={1.2}>
            <Center>
              {signedUrl ? <Model3D key={signedUrl} url={signedUrl} /> : null}
            </Center>
          </Bounds>
        </Suspense>

        <OrbitControls ref={ref} makeDefault />
        <Background />
      </Canvas>
    </div>
  );
}

export default ModuleViewer;
