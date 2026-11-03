// react-plotly.js bundles plotly.js/dist/plotly; importing the same file avoids shipping a second copy.
declare module "plotly.js/dist/plotly" {
    import Plotly from "plotly.js";
    export default Plotly;
}
