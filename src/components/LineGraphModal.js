'use client';

import { Button, Modal } from 'flowbite-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

export default function LineGraphModal( { openModal, setOpenModal, xAxis, yAxis, previousYAxis , previousSettingsLabel, xAxisLabel, yAxisLabel, title} ) {
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
          </Modal.Footer>
        </Modal>
      </>
    );
  }
