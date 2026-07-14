import Hero from '../components/Hero'
import Collections from '../components/Collections'
import BestSellers from '../components/BestSellers'
import NewArrivals from '../components/NewArrivals'
import ShopByCategory from '../components/ShopByCategory'
import MareaPromise from '../components/MareaPromise'
import WhyChoose from '../components/WhyChoose'
import Testimonials from '../components/Testimonials'
import JewelryCare from '../components/JewelryCare'
import Newsletter from '../components/Newsletter'

export default function HomePage() {
  return (
    <>
      <Hero />
      <Collections />
      <BestSellers />
      <NewArrivals />
      <ShopByCategory />
      <MareaPromise />
      <WhyChoose />
      <Testimonials />
      <JewelryCare />
      <Newsletter />
    </>
  )
}
