import React, { Component } from 'react';
import ReactDOM from 'react-dom';

class Tooltip extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    let { left, top, width } = this.props;
    const { forceLeft, position, rectGetter, parent } = this.props;

    // rectGetter? Get rect!
    if (rectGetter) {
      const rect = rectGetter();
      if (rect) {
        left = rect.left;
        top = rect.top;
        width = rect.width;
      }
    }
    // Was props.parent set? Query parent element and get its rect
    else if (parent) {
      const parentEl = typeof parent === 'string' ? document.querySelector(parent) : parent;

      if (!parentEl) {
        return;
      }

      const rect = parentEl.getBoundingClientRect();
      left = rect.left;
      top = rect.top;
      width = rect.width;
    }

    // Get tooltip ref for width centering
    const ref = ReactDOM.findDOMNode(this.refs.tooltip);
    if (ref) {
      const refRect = ref.getBoundingClientRect();
      const scrollY = window.scrollY ? window.scrollY : window.pageYOffset;
      const scrollX = window.scrollX ? window.scrollX : window.pageXOffset;

      // Skip next componentDidUpdate
      this._skip = true;

      // Set state
      this.setState({ // eslint-disable-line react/no-did-mount-set-state
        top: top - (position === 'left' ? 0 : refRect.height) + scrollY,
        left: forceLeft || (left - (refRect.width / 2) + (width / 2) + scrollX),
        width,
      });
    }
  }

  componentDidUpdate() {
    // skip componentDidUpdate if necessary
    if (this._skip){
      return this._skip = false;
    }
    this.componentDidMount();
  }

  render() {
    const {onMouseOver, onMouseLeave, active} = this.props;

    // Is server?
    if (typeof window === 'undefined') {
      return null;
    }

    // Left/Top
    const left = `${this.state.left}px`;
    const top = `${this.state.top + 1}px`;

    // Style
    const style = {
      transition: 'all .3s ease-in-out, visibility .3s ease-in-out',
      zIndex: 3,
      position: 'absolute',
      left,
      top,
    }

    // If !active => opacity = 0
    if (active === false) {
      style.opacity = 0;
    }

    return (
      <div ref="tooltip" style={style} onMouseOver={onMouseOver} onMouseLeave={onMouseLeave}>
        {this.props.children}
        <div style={{ backgroundColor: 'transparent', height: '5px', width: '100%', clear: 'both' }} />
      </div>
    );
  }
}

// Store active portals and the portal dom element here
let store;
const Portal = {
  // Remove a portal from the list of portals safely
  removePortalFromList: (portals, props) => {
    if(!props) {
      return portals;
    }
    return portals.filter(portal => props.uid !== portal.uid);
  },

  // Add a portal to the list of portals safely
  addPortalToList: (portals, props) => {
    if(!props) {
      return portals;
    }
    return [
      ...Portal.removePortalFromList(portals, props),
      props,
    ]
  },

  // Create the store and the dom element div
  createPortalNode: () => {
    store = {
      portals: [],
      el: document.createElement('div'),
      timeout: null,
    };
    document.body.appendChild(store.el);
  },

  // Remove a portal
  removePortal: props => {
    if (props && store && store.portals.filter(portal => props.uid === portal.uid).length > 0) {
      store.portals = Portal.removePortalFromList(store.portals, props);
      // Other tooltip was active, switching
      if (store.portals.length > 0) {
        const item = store.portals[store.portals.length - 1];
        return item ? Portal.renderPortal(item, true) : null;
      } else {
        Portal.renderPortal({ ...props, active: false }, true);
        store.timeout = setTimeout(()=> {
          if (store.portals.length > 0) {
            const item = store.portals[store.portals.length - 1];
            return item ? Portal.renderPortal(item, true) : null;
          } else {
            ReactDOM.unmountComponentAtNode(store.el);
            if (store.el.parentNode) {
              store.el.parentNode.removeChild(store.el);
            }
            store = null;
          }
        }, 500);
      }
    } return undefined;
  },

  // Render a portal
  renderPortal: (props, renderOnly) => {
    if(!props){
      return;
    }

    if (!renderOnly){
      if (!store) {
        Portal.createPortalNode();
      } else if (store.timeout) {
        //clearTimeout(store.timeout);
        //store.timeout = null;
      }
      store.portals = Portal.addPortalToList(store.portals, props);
    }

    const {Element, ...actualProps} = props;
    ReactDOM.render(<Tooltip {...actualProps}><Element {...actualProps} /></Tooltip>, store.el);
  }
}

export default Portal;
