import { WebContainer } from '@webcontainer/api';
import { initFiles } from '../constant/initFiles';
// Call only once
const webcontainerInstance = await WebContainer.boot();

webcontainerInstance.mount(initFiles);

export default webcontainerInstance;
