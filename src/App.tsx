import { BrowserRouter, Routes, Route } from "react-router-dom";
import ApplicationLayout from "./layouts/application-layout";
import BillSplitter from "./pages/landing";
import NotFound from "./pages/not-found";

// Bill Splitter is a client-only calculator (D1): one public route `/`, no auth,
// no Supabase, no /demo/* — the tool is its own demo via the seed bill.
const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<ApplicationLayout />}>
        <Route path="/" element={<BillSplitter />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
