import {Stats} from './perf';
import {keys, each} from 'lodash-es';

const statsHeap = {
  timeStep: 0,
};

each(keys(Stats), s => {
  statsHeap[s] = 0;
});

export default statsHeap;
