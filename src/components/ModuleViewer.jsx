import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import axios from 'axios';
import { Button } from 'flowbite-react';
import * as THREE from 'three';
import { TbAugmentedReality2 } from "react-icons/tb";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { API_URL } from "../env";

function Model3D({ url }) {
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
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
    try {
      const response = await axios.get(`${apiUrl}/generate-signed-url/?blob_name=${url}`);
      setSignedUrl(response.data.url);
      console.log("Signed URL for 3D Model: " + response.data.url);
    } catch (error) {
      console.error("Error generating signed URL", error);
      setError(error);
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

  return (
    <div className="relative w-full h-full">
      <Button className="absolute top-4 right-4">
        View in AR/VR
        <TbAugmentedReality2 className="ml-2" />
      </Button>
      
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 50 }}>
        <Suspense
          fallback={
            <mesh position-y={0.5} scale={[2, 3, 2]}>
              <boxGeometry args={[1, 1, 1, 2, 2, 2]} />
              {/* <meshBasicMaterial wireframe color="red" /> */}
            </mesh>
          }>
          <Stage controls={ref} preset="rembrandt" intensity={1} environment="city">
            {signedUrl ? <Model3D url={signedUrl} /> : null}
          </Stage>
        </Suspense>

        <OrbitControls ref={ref} />
        <Background />
      </Canvas>
    </div>
  );
}

export default ModuleViewer;
