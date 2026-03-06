import { BrowserRouter, Routes, Route } from 'react-router'

import AppLayout from './layout/AppLayout'
import Home from './pages/Home'
import { ScrollToTop } from './components/common/ScrollToTop'

import SignIn from './pages/AutpPages/SignIn'
import SignUp from './pages/AutpPages/SIgnUp'
import Order from './pages/Order'

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />


          <Route path="order" element={<Order />} />
          {/* <Route path="signup" element={<SignUp />} /> */}
        </Route>

        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />


        {/* <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
