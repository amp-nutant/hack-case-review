import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeWrapper } from '@nutanix-core/prism-ui-themes-common';
import { store } from './redux/store';
import App from './App';

import '@nutanix-core/prism-ui-themes-common/lib/styles/css/index.css';
import '@nutanix-ui/prism-reactjs/dist/index.css';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeWrapper>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </ThemeWrapper>
  </React.StrictMode>
);
