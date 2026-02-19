# Global Urban Demographic Change and Migration Patterns
<img src="03_documents/03_other_figures/fig4_slice.png" alt="Urban Density Map" width="800">  

---
## Overview
This repository contains all code, processed data, and figures to reproduce analyses from the manuscript on global urban demographic change and migration patterns.  

### Change in Urban Dependency Ratio Between 2000-2020

<table>
  <tr>
    <td align="center">
      <img src="03_documents/03_other_figures/Japan_population_dependency_ratio.gif" width="400" alt="Japan Dependency Ratio"><br>
      <b>Japan</b>
    </td>
    <td align="center">
      <img src="03_documents/03_other_figures/Ghana_population_dependency_ratio.gif" width="400" alt="GhanaDependency Ratio"><br>
      <b>Ghana</b>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="03_documents/03_other_figures/United States_population_dependency_ratio.gif" width="400" alt="United States Dependency Ratio"><br>
      <b>United States</b>
    </td>
    <td align="center">
      <img src="03_documents/03_other_figures/Ukraine_population_dependency_ratio.gif" width="400" alt="Ukraine Dependency Ratio"><br>
      <b>Ukraine</b>
    </td>
  </tr>
</table>  

View this [interactive population animation](https://zimmermaps.github.io/urban_demography/interactive_population_animation.html) to explore dynamic dependency ratio vs. population plots.

---

## Project Structure

```bash
urban_demography/
├── 01_data/                                # raw and processed datasets
│   ├── 01_urban_agesex_output/             # raw output from zonal stats of WP data with GHS-UCDB
│   ├── 02_auxiliary_data/                  # contains death rate information
│   ├── 03_ghs_ucdb/                        # GHS-UCDB (R2024A)
│   ├── 04_final_demographic_data/          # final demographic outputs used for analysis
├── 02_code/                                # Jupyter notebooks for analysis
│   ├── 01_initial_zonal_extract.ipynb      # initial zonal stats extract
│   ├── 02_dataset_merge.ipynb              # merging datasets across years
│   ├── 03_demographic_processing.ipynb     # calculate key demographic metrics
│   ├── 04_demographic_change.ipynb         # calculate change over time
│   ├── 05_gudd_figures.ipynb               # main manuscript figures
│   ├── 06_supplement_figures.ipynb         # supplemental figures
│   ├── 07_fun_figures.ipynb                # other visualizations
├── 03_documents/                           # figures, tables, and supporting documents
│   ├── 01_main_figures/                    # main figures (pdf)
│   ├── 02_supplement_figures/              # supplement figures (pdf/png)
│   ├── 03_other_figures/                   # other visualizations
├── README.md                               # this file
└── requirements.txt                        # python dependencies for reproducibility
```
---

## Installation Instructions
clone this repo and run locally:

```bash
# Clone repository
git clone <repo-url>
cd urban_demography

# Set up virtual environment
python -m venv .venv
source .venv/bin/activate       # macOS/Linux
# .venv\Scripts\activate        # Windows

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Update dependencies if adding new packages
pip freeze > requirements.txt

# You'll need to unzip files to run code - details below
```
---

## Global Urban Demographic Dataset (GUDD)

The final analysis output is located at:

`01_data/04_final_demographic_data/`

It is organized into two subfolders:

- `01_static_boundaries/`  
- `02_dynamic_boundaries/`  

Each folder contains three key files. They are zipped, so you will need to unzip them first.

- `gudd_all` – raw population counts for each age-sex cohort, for every year from 2000-2020 and every city.
- `gudd_annual_metrics` – demographic metrics (dependency ratio, sex ratio, child-woman ratio, natural change, migration etc.) for every year and every city.
- `gudd_change` – change in demographic metrics between 2000 and 2020.
