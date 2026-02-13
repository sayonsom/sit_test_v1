import React, { useState, useEffect } from 'react';
import { Button, Label, TextInput } from 'flowbite-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LineGraphModal from './LineGraphModal';
import { API_URL } from "../env";

const ExperimentFormParameteric = ({ url }) => {
  const [config, setConfig] = useState(null);
  const [variables, setVariables] = useState({});
  const [chartData, setChartData] = useState({ xAxis: [], yAxis: [] });
  const [yAxisLabel, setYAxisLabel] = useState('');
  const [previousData, setPreviousData] = useState({ xAxis: [], yAxis: [] });
  const [previousSettingsLabel, setPreviousSettingsLabel] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [computeModuleLoaded, setComputeModuleLoaded] = useState(false);



  

  const apiUrl = API_URL;

  const fetchConfig = async () => {
    try {
      console.log('Fetching signed URL...');
      const signedUrlResponse = await axios.get(`${apiUrl}/generate-signed-url/?blob_name=${url}`);
      const signedUrl = signedUrlResponse.data.url;
      console.log('Signed URL:', signedUrl);

      console.log('Fetching configuration using signed URL...');
      const configResponse = await fetch(signedUrl);
      console.log('Config Respone:')
      console.log('Config Response Status:', configResponse.status);
      console.log('Config Response Headers:', configResponse.headers);

      if (!configResponse.ok) {
        throw new Error(`Network response was not ok, status: ${configResponse.status}`);
      }

      console.log('Parsing configuration response to JSON...');
      const configData = await configResponse.json();

      console.log('Config Data:', configData);
      setConfig(configData);

      console.log('Loading external script...');
   
      const scriptUrlResponse = await axios.get(`${apiUrl}/generate-signed-url/?blob_name=${configData.compute}`);
      const scriptUrl = scriptUrlResponse.data.url;
      const scriptId = 'compute-module-script';
      await loadScript(scriptUrl, scriptId);
      setComputeModuleLoaded(true);
      

      console.log('Compute module loaded');
    } catch (error) {
      console.error(error);
    }
  };

  const loadScript = (src, id) => {
    return new Promise((resolve, reject) => {
      if (document.getElementById(id)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = src;
      script.id = id;
      script.onload = () => {
        console.log('Script loaded:', id);
        resolve();
      };
      script.onerror = () => {
        console.error('Error loading script:', id);
        reject();
      };

      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    fetchConfig();
  }, [url]);

  useEffect(() => {
    
    if (config) {

      const initialVariables = Object.keys(config.variables).reduce((acc, key) => {
        acc[key] = config.variables[key].initial;
        return acc;
      }, {});
      setVariables(initialVariables);
    }
  }, [config]);

  const handleInputChange = (name, value) => {
    setVariables((prev) => ({ ...prev, [name]: value }));
  };

  const handleCompute = () => {
    if (!computeModuleLoaded) {
      console.error('Compute module is not loaded yet');
      return;
    }

    setPreviousSettingsLabel(yAxisLabel);

    let label = '';
    for (const [key, value] of Object.entries(variables)) {
      label += `${config.variables[key].variableLabel} = ${value}, `;
    }
    label = label.slice(0, -2);
    setYAxisLabel(label);

    const inputArgs = { ...variables };

    const result = window.MyLibrary.calculate(inputArgs);

    setPreviousData({
      xAxis: chartData.xAxis,
      yAxis: chartData.yAxis,
    });

    setChartData({
      xAxis: result.x,
      yAxis: result.y,
    });


    setOpenModal(true);
  };

  if (!config) {
    return <div>Loading configuration...</div>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleCompute();
      }}
    >
      {Object.keys(config.variables).map((key) => {
        const variableConfig = config.variables[key];
        return (
          <div key={key}>
            <div className="mb-2 block">
              <Label htmlFor={key} value={variableConfig.variableLabel} />
            </div>
            <TextInput
              id={key}
              type="number"
              value={variables[key]}
              onChange={(e) => handleInputChange(key, parseFloat(e.target.value) || 0)}
              min={variableConfig.min}
              max={variableConfig.max}
              step={variableConfig.step || 'any'}
              helperText={variableConfig.variableDescription}
            />
          </div>
        );
      })}
      <Button type="submit" outline gradientDuoTone="pinkToOrange">
        Start Experiment
      </Button>
      <LineGraphModal
        openModal={openModal}
        setOpenModal={setOpenModal}
        xAxis={chartData.xAxis}
        yAxis={chartData.yAxis}
        previousYAxis={previousData.yAxis}
        xAxisLabel={config.output_plot.xAxisLabel}
        yAxisLabel={config.output_plot.yAxisLabel}
        previousSettingsLabel={previousSettingsLabel}
        title={config.output_plot.title}
      />
    </form>
  );
};

export default ExperimentFormParameteric;
