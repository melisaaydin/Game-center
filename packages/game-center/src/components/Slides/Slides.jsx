import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import Slider from "react-slick";
import { ColorModeContext } from "../../context/ThemeContext";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./Slides.css";
import A from "../../assets/4.avif";
import B from "../../assets/dice.png";
import C from "../../assets/first.png";
import D from "../../assets/2.png";
import E from "../../assets/6.png";
import F from "../../assets/5.png";
import { useTranslation } from 'react-i18next';

const slides = [
    { id: 1, img: C, alt: "slide1", path: "/slide1" },
    { id: 2, img: A, alt: "slide2", path: "/slide2" },
    { id: 3, img: B, alt: "slide3", path: "/slide3" },
    { id: 4, img: F, alt: "slide4", path: "/slide4" },
    { id: 5, img: E, alt: "slide5", path: "/slide5" },
    { id: 6, img: D, alt: "slide6", path: "/slide6" },
];

const FeaturedGamesSlider = () => {
    const { t } = useTranslation('slides');
    const navigate = useNavigate();
    const { mode } = useContext(ColorModeContext);

    const settings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 3,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 2000,
        pauseOnHover: true,
        arrows: true,
        responsive: [
            {
                breakpoint: 900,
                settings: {
                    slidesToShow: 2,
                },
            },
            {
                breakpoint: 600,
                settings: {
                    slidesToShow: 1,
                },
            },
        ],
    };

    return (
        <div className={`slider-container ${mode}`}>
            <Slider {...settings}>
                {slides.map((slide) => (
                    <div
                        key={slide.id}
                        className="slide-item"
                        onClick={() => navigate(slide.path)}
                    >
                        <img src={slide.img} alt={t('slideAlt', { number: slide.id })} />
                    </div>
                ))}
            </Slider>
        </div>
    );
};

export default FeaturedGamesSlider;