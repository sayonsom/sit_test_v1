'use client';

import { Button, Modal, Select } from 'flowbite-react';
import { useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

export default function LineGraphModal( { openModal, setOpenModal, xAxis, yAxis, previousYAxis , previousSettingsLabel, xAxisLabel, yAxisLabel, title} ) {

    const handleIhaveADoubt = () => {
      // go to a new url in a new tab
      window.open('https://docs.google.com/forms/d/1ZVxx4i3v4U2ox8DWcHIfqB3UEq3OMemw3ESwFFpC4FI', '_blank');
      // set the modal to close
      setOpenModal(false);
    }

  
    return (
      <>

        <Modal show={openModal} onClose={() => setOpenModal(false)}>
          <Modal.Header>Experiment Output</Modal.Header>
          <Modal.Body>
            <HighchartsReact
              highcharts={Highcharts}
              options={{
                title: {
                  text: title,
                },
                credits: {
                    enabled: false,
                    },
                exporting: {
                  enabled: true,
                },
                xAxis: {
                  title: {
                    text: xAxisLabel,
                  },
                  categories: xAxis,
                },
                yAxis: {
                  title: {
                    text: yAxisLabel,
                  },
                },
                series: [
                  {
                    name: yAxisLabel,
                    data: yAxis,
                  },
                  {
                    name: previousSettingsLabel,
                    data: previousYAxis,
                  },
                ],
              }}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={() => setOpenModal(false)}>Okay</Button>
            <Button color="gray" onClick={handleIhaveADoubt}>
              I have a doubt
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }